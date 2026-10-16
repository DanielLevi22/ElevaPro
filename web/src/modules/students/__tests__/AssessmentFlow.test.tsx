import { PHYSICAL_ASSESSMENT_COLUMNS } from "@elevapro/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeLinkedSpecialist, getSession, authProfile } = vi.hoisted(() => ({
  authorizeLinkedSpecialist: vi.fn(),
  getSession: vi.fn(),
  authProfile: { id: "specialist-1", accountType: "specialist" },
}));

// Só as fronteiras externas são simuladas: formulário, hooks, HTTP e rotas
// executam juntos, para um sucesso inventado no hook não esconder a falha.
let savedAssessments: Record<string, unknown>[];
let rejectWrite: boolean;
let savedRevisions: Record<string, unknown>[];
const allowedColumns = new Set(PHYSICAL_ASSESSMENT_COLUMNS.split(", "));

vi.mock("@/lib/api-auth", () => ({ authorizeLinkedSpecialist }));
vi.mock("@/lib/security-audit", () => ({ recordSecurityAuditEvent: vi.fn() }));
vi.mock("@elevapro/supabase", () => ({ supabase: { auth: { getSession } } }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "student-1" }) }));
vi.mock("@/shared/hooks/useStudents", () => ({
  useStudents: () => ({ data: [{ id: "student-1", full_name: "Aluno fictício" }] }),
}));
vi.mock("@/shared/hooks/useAuthUser", () => ({
  useAuthUser: () => ({ data: authProfile }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    rpc: async (
      _name: string,
      input: { p_expected: Record<string, unknown>; p_changes: Record<string, unknown> },
    ) => {
      if (rejectWrite) return { data: null, error: { code: "40001" } };
      savedRevisions.push({
        id: "revision-1",
        corrected_at: "2026-10-16T13:00:00Z",
        previous_values: input.p_expected,
      });
      Object.assign(savedAssessments[0], input.p_changes);
      return { data: savedAssessments[0], error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: savedAssessments, error: null }) }),
      }),
      insert: (record: Record<string, unknown>) => ({
        select: () => ({ single: async () => persistAssessment(record) }),
      }),
    }),
  },
}));
vi.mock("@/lib/supabase-titular", () => ({
  clienteDoTitular: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ order: async () => ({ data: savedRevisions, error: null }) }) }),
      }),
    }),
  }),
}));

import {
  GET as GET_REVISIONS,
  PATCH,
} from "@/app/api/students/[id]/assessments/[assessmentId]/route";
import { GET, POST } from "@/app/api/students/[id]/assessments/route";
import StudentAssessmentsPage from "../pages/StudentAssessmentsPage";

function persistAssessment(record: Record<string, unknown>) {
  const hasUnknownColumn = Object.keys(record).some((key) => !allowedColumns.has(key));
  if (rejectWrite || hasUnknownColumn) {
    return { data: null, error: { code: "PGRST204", message: "Escrita recusada" } };
  }
  const assessment = Object.fromEntries([...allowedColumns].map((key) => [key, null]));
  Object.assign(assessment, record, { id: "assessment-1", created_at: "2026-10-16T12:00:00Z" });
  savedAssessments = [assessment, ...savedAssessments];
  return { data: assessment, error: null };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StudentAssessmentsPage />
    </QueryClientProvider>,
  );
  return client;
}

async function openAssessment() {
  await screen.findByText("Sem avaliações");
  await userEvent.click(screen.getAllByRole("button", { name: /Nova Avaliação/ })[0]);
}

async function fillComposition() {
  await userEvent.type(screen.getByLabelText(/peso/i), "92");
  await userEvent.type(screen.getByLabelText(/altura/i), "174");
}

describe("avaliação física: formulário → API → histórico", () => {
  beforeEach(() => {
    savedAssessments = [];
    savedRevisions = [];
    authProfile.id = "specialist-1";
    authProfile.accountType = "specialist";
    rejectWrite = false;
    authorizeLinkedSpecialist.mockResolvedValue({ ok: true, caller: { id: "specialist-1" } });
    getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const request = new NextRequest(`https://elevapro.test${url}`, {
          method: init?.method,
          headers: init?.headers,
          body: init?.body,
        });
        const context = { params: Promise.resolve({ id: "student-1" }) };
        if (url.endsWith("/assessment-1")) {
          const correctionContext = {
            params: Promise.resolve({ id: "student-1", assessmentId: "assessment-1" }),
          };
          return init?.method === "PATCH"
            ? PATCH(request, correctionContext)
            : GET_REVISIONS(request, correctionContext);
        }
        return init?.method === "POST" ? POST(request, context) : GET(request, context);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("salva só a primeira aba e mostra peso, altura, IMC e observações no histórico", async () => {
    renderPage();
    await openAssessment();
    await fillComposition();
    await userEvent.type(screen.getByLabelText(/observações/i), "Observação fictícia");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("92 kg")).toBeInTheDocument();
    expect(screen.getByText("174 cm")).toBeInTheDocument();
    expect(screen.getByText("IMC 30.4")).toBeInTheDocument();
    expect(screen.getByText("Observação fictícia")).toBeInTheDocument();
  });

  it("abre a avaliação existente preenchida para corrigir um erro", async () => {
    persistAssessment({
      student_id: "student-1",
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
      notes: "Nota original",
      circ_waist: 88,
      skinfold_abdomen: 18,
    });
    renderPage();
    await screen.findByText("92 kg");
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    expect(screen.getByLabelText(/peso/i)).toHaveValue(92);
    expect(screen.getByLabelText(/altura/i)).toHaveValue(175);
    expect(screen.getByLabelText(/observações/i)).toHaveValue("Nota original");
    await userEvent.click(screen.getByRole("button", { name: "Circunferências" }));
    expect(screen.getByLabelText(/Cintura \(cm\)/)).toHaveValue(88);
    await userEvent.click(screen.getByRole("button", { name: "Dobras" }));
    expect(screen.getByLabelText(/Abdominal \(mm\)/)).toHaveValue(18);
  });

  it("salva a correção na mesma avaliação e permite consultar o valor retificado", async () => {
    persistAssessment({
      student_id: "student-1",
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
      notes: "Nota original",
      body_fat_pct: 22,
      circ_waist: 88,
      skinfold_abdomen: 18,
    });
    renderPage();
    await screen.findByText("92 kg");
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    await userEvent.clear(screen.getByLabelText(/peso/i));
    await userEvent.type(screen.getByLabelText(/peso/i), "91");
    await userEvent.click(screen.getByRole("button", { name: "Circunferências" }));
    await userEvent.clear(screen.getByLabelText(/Cintura \(cm\)/));
    await userEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("91 kg")).toBeInTheDocument();
    const response = await fetch("/api/students/student-1/assessments");
    expect((await response.json()).assessments).toMatchObject([
      {
        id: "assessment-1",
        weight_kg: 91,
        created_at: "2026-10-16T12:00:00Z",
        body_fat_pct: 22,
        circ_waist: null,
        skinfold_abdomen: 18,
      },
    ]);
    expect(screen.queryByText("92 kg")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Histórico de correções" }));
    expect(await screen.findByText("92 kg")).toBeInTheDocument();
    expect(screen.getByText(/Versão retificada/)).toBeInTheDocument();
  });

  it("descarta o rascunho cancelado e não preenche uma nova avaliação com valores antigos", async () => {
    persistAssessment({
      student_id: "student-1",
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
    });
    renderPage();
    await screen.findByText("92 kg");
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    await userEvent.clear(screen.getByLabelText(/peso/i));
    await userEvent.type(screen.getByLabelText(/peso/i), "91");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    expect(screen.getByLabelText(/peso/i)).toHaveValue(92);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: /Nova Avaliação/ }));
    expect(screen.getByLabelText(/peso/i)).toHaveValue(null);
    expect(screen.getByLabelText(/altura/i)).toHaveValue(null);
  });

  it("mantém a correção preenchida quando outra sessão já salvou uma versão", async () => {
    persistAssessment({
      student_id: "student-1",
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
    });
    renderPage();
    await screen.findByText("92 kg");
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    await userEvent.clear(screen.getByLabelText(/peso/i));
    await userEvent.type(screen.getByLabelText(/peso/i), "91");
    rejectWrite = true;
    await userEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/outra sessão/);
    expect(screen.getByLabelText(/peso/i)).toHaveValue(91);
    expect(screen.getByText("92 kg")).toBeInTheDocument();
  });

  // LGPD, arts. 6º, VII e 46: uma sessão que perdeu vínculo não pode corrigir saúde pelo BFF.
  it("não corrige quando o servidor recusa a autorização", async () => {
    persistAssessment({
      student_id: "student-1",
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
    });
    renderPage();
    await screen.findByText("92 kg");
    await userEvent.click(screen.getByRole("button", { name: "Corrigir avaliação" }));
    await userEvent.clear(screen.getByLabelText(/peso/i));
    await userEvent.type(screen.getByLabelText(/peso/i), "91");
    authorizeLinkedSpecialist.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Sem vínculo ativo" }, { status: 403 }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem vínculo ativo");
    expect(
      screen.getByText("92 kg"),
      "SAÚDE ALTERADA: recusa de autorização não preservou a avaliação",
    ).toBeInTheDocument();
  });

  // LGPD, arts. 6º, VII e 46: CASL e autoria não oferecem edição de avaliação de outro profissional.
  it.each([
    "student",
    "specialist",
  ])("não oferece correção a %s que não é autor", async (accountType) => {
    authProfile.id = "other-account";
    authProfile.accountType = accountType;
    persistAssessment({
      specialist_id: "specialist-1",
      measured_by: "specialist",
      weight_kg: 92,
      height_cm: 175,
    });
    renderPage();
    await screen.findByText("92 kg");
    expect(
      screen.queryByRole("button", { name: "Corrigir avaliação" }),
      "SAÚDE EDITÁVEL: conta sem autoria recebeu ação de correção",
    ).not.toBeInTheDocument();
  });

  it("recusa troca de titular no corpo da correção", async () => {
    const response = await fetch("/api/students/student-1/assessments/assessment-1", {
      method: "PATCH",
      body: JSON.stringify({ expected: {}, changes: { student_id: "other-student" } }),
    });
    expect(response.status).toBe(422);
  });

  it("envia as três abas e recupera as medidas sem perder lados ou dobras", async () => {
    renderPage();
    await openAssessment();
    await fillComposition();
    await userEvent.click(screen.getByRole("button", { name: "Circunferências" }));
    await userEvent.type(screen.getByLabelText(/Cintura \(cm\)/), "88");
    await userEvent.type(screen.getByLabelText(/Antebraço D/), "28");
    await userEvent.type(screen.getByLabelText(/Antebraço E/), "27");
    await userEvent.type(screen.getByLabelText(/Panturrilha E/), "38");
    await userEvent.click(screen.getByRole("button", { name: "Dobras" }));
    await userEvent.type(screen.getByLabelText(/Abdominal \(mm\)/), "18");
    await userEvent.type(screen.getByLabelText(/Tríceps \(mm\)/), "12");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const response = await fetch("/api/students/student-1/assessments");
    expect(await response.json()).toMatchObject({
      assessments: [
        {
          weight_kg: 92,
          height_cm: 174,
          circ_waist: 88,
          circ_right_forearm: 28,
          circ_left_forearm: 27,
          circ_left_calf: 38,
          skinfold_abdomen: 18,
          skinfold_tricep: 12,
        },
      ],
    });
    expect(screen.getAllByText("88 cm").length).toBeGreaterThan(0);
  });

  it("mantém a ficha preenchida após erro do servidor e permite tentar novamente", async () => {
    renderPage();
    await openAssessment();
    await fillComposition();
    rejectWrite = true;
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno do servidor");
    expect(screen.getByLabelText(/peso/i)).toHaveValue(92);
    expect(screen.getByLabelText(/altura/i)).toHaveValue(174);
    rejectWrite = false;
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    expect(await screen.findByText("92 kg")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // LGPD, arts. 6º, VII e 46: o formulário não pode transformar uma recusa
  // de autorização em escrita ou exposição de medidas no histórico.
  it("não grava nem exibe saúde quando o especialista perde autorização", async () => {
    renderPage();
    await openAssessment();
    await fillComposition();
    authorizeLinkedSpecialist.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Sem vínculo ativo" }, { status: 403 }),
    });
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem vínculo ativo");
    const response = await fetch("/api/students/student-1/assessments");
    expect(
      await response.json(),
      "SAÚDE EXPOSTA: avaliação de escrita recusada apareceu na leitura",
    ).toEqual({ assessments: [] });
    expect(
      screen.queryByText("92 kg"),
      "SAÚDE EXPOSTA: conta recusada alterou o histórico",
    ).not.toBeInTheDocument();
  });

  it("exige altura antes do envio e mantém as outras abas opcionais", async () => {
    renderPage();
    await openAssessment();
    await userEvent.type(screen.getByLabelText(/peso/i), "92");
    await userEvent.click(screen.getByRole("button", { name: "Salvar Avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/obrigatórios/i);
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(
      0,
    );
    expect(within(screen.getByRole("dialog")).getByLabelText(/peso/i)).toHaveValue(92);
  });
});
