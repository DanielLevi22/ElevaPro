-- Limite durável por janela fixa (issue #322).
-- `subject_hash` chega como HMAC-SHA-256 calculado no BFF: não há IP, e-mail,
-- token, corpo de request nem dado de saúde nesta tabela.

CREATE SCHEMA IF NOT EXISTS private;
--> statement-breakpoint

CREATE TABLE private.rate_limit_buckets (
  bucket text NOT NULL,
  subject_hash text NOT NULL,
  window_started_at timestamp with time zone NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT rate_limit_buckets_pkey PRIMARY KEY (bucket, subject_hash, window_started_at),
  CONSTRAINT rate_limit_buckets_bucket_length CHECK (char_length(bucket) BETWEEN 1 AND 80),
  CONSTRAINT rate_limit_buckets_subject_hash_format CHECK (subject_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT rate_limit_buckets_hits_positive CHECK (hits > 0),
  CONSTRAINT rate_limit_buckets_expiry_after_window CHECK (expires_at > window_started_at)
);
--> statement-breakpoint

CREATE INDEX rate_limit_buckets_expires_at_idx ON private.rate_limit_buckets (expires_at);
--> statement-breakpoint

ALTER TABLE private.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY rate_limit_buckets_no_client_access
  ON private.rate_limit_buckets FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
--> statement-breakpoint

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON TABLE private.rate_limit_buckets TO service_role;
--> statement-breakpoint

-- O UPSERT mantém decisão e incremento na mesma operação atômica. A limpeza no
-- consumo torna a retenção efetiva sem depender de um cron externo.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer,
  p_retention_seconds integer
)
RETURNS TABLE(allowed boolean, remaining integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_hits integer;
  v_retry_after_seconds integer;
BEGIN
  IF char_length(p_bucket) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'bucket must have 1 to 80 characters; received %', char_length(p_bucket);
  END IF;
  IF p_subject_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'subject_hash must be a lowercase SHA-256 HMAC hex digest';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'limit must be between 1 and 1000; received %', p_limit;
  END IF;
  IF p_window_seconds NOT BETWEEN 1 AND 3600 THEN
    RAISE EXCEPTION 'window_seconds must be between 1 and 3600; received %', p_window_seconds;
  END IF;
  IF p_retention_seconds NOT BETWEEN p_window_seconds AND 86400 THEN
    RAISE EXCEPTION 'retention_seconds must be between window_seconds and 86400; received %', p_retention_seconds;
  END IF;

  DELETE FROM private.rate_limit_buckets WHERE expires_at <= v_now;
  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO private.rate_limit_buckets (bucket, subject_hash, window_started_at, hits, expires_at)
  VALUES (
    p_bucket, p_subject_hash, v_window_started_at, 1,
    v_window_started_at + make_interval(secs => p_retention_seconds)
  )
  ON CONFLICT (bucket, subject_hash, window_started_at) DO UPDATE
  SET hits = LEAST(private.rate_limit_buckets.hits + 1, p_limit + 1)
  RETURNING hits INTO v_hits;

  v_retry_after_seconds := GREATEST(
    1,
    ceil(extract(epoch FROM (v_window_started_at + make_interval(secs => p_window_seconds)) - v_now))::integer
  );

  RETURN QUERY SELECT v_hits <= p_limit, GREATEST(p_limit - v_hits, 0), v_retry_after_seconds;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer, integer)
  TO service_role;
--> statement-breakpoint

COMMENT ON TABLE private.rate_limit_buckets IS
  'Contadores efêmeros de limite de requisições. subject_hash é HMAC; expira em até 24 horas.';
