/* @ds-bundle: {"format":4,"namespace":"ElevaPro_ea5fe8","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"ProgressCard","sourcePath":"components/data/ProgressCard.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SidebarNavItem","sourcePath":"components/navigation/SidebarNavItem.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"942ab5785c84","components/core/Badge.jsx":"8fe7a7c804b7","components/core/Button.jsx":"914a8616356e","components/core/Card.jsx":"9a796ba6b307","components/core/Switch.jsx":"40be9c8ac1ec","components/data/ProgressCard.jsx":"345d7307608b","components/data/StatCard.jsx":"b179d62087a1","components/feedback/Dialog.jsx":"b4475f67aa81","components/feedback/Toast.jsx":"44e32def5ac1","components/forms/FormField.jsx":"cad7f0928170","components/forms/Input.jsx":"f90416783ba1","components/navigation/SidebarNavItem.jsx":"c32489005a44","mobile/kit/hero-objects.js":"c293393b724e","mobile/kit/kit.jsx":"37e4861b15af","mobile/student/01-onboarding/aluno-convite.jsx":"20870bcb531c","mobile/student/01-onboarding/onb-screens-a.jsx":"8442df1bf299","mobile/student/01-onboarding/onb-screens-b.jsx":"9b753890bc4a","mobile/student/propostas/ajuste-do-plano/aj-a.jsx":"90bfd53b1d8d","mobile/student/propostas/ajuste-do-plano/aj-b.jsx":"aad5169361e8","mobile/student/propostas/uso-diario/pecas.jsx":"4ce0cd67d023"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ElevaPro_ea5fe8 = window.ElevaPro_ea5fe8 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
const SIZES = {
  sm: 32,
  md: 40,
  lg: 48
};

/** Initials/photo avatar circle. Mirrors the header avatar in app/src/app/(tabs)/index.tsx and the student-initial circle in web StudentCard.tsx. */
function Avatar({
  name = "?",
  src,
  size = "md",
  online,
  style
}) {
  const px = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: px,
      height: px,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: px,
      height: px,
      borderRadius: "50%",
      overflow: "hidden",
      background: `hsl(var(--primary) / 0.1)`,
      color: `hsl(var(--primary))`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: px * 0.4,
      border: "2px solid hsl(var(--border))"
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : name.charAt(0).toUpperCase()), online && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: -1,
      right: -1,
      width: px * 0.3,
      height: px * 0.3,
      borderRadius: "50%",
      background: "hsl(var(--success))",
      border: "2px solid hsl(var(--background))"
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  success: {
    color: "var(--emerald-500)"
  },
  warning: {
    color: "var(--amber-500)"
  },
  danger: {
    color: "var(--red-500)"
  },
  neutral: {
    color: "var(--zinc-500)"
  },
  primary: {
    color: "var(--lime)"
  },
  secondary: {
    color: "var(--cyber-blue)"
  }
};

/** Status pill. Mirrors app/src/components/ui/StatusBadge.tsx and the account-status chips on web StudentCard.tsx — uppercase micro label, optional dot, tinted background at 10% + border at 20%. */
function Badge({
  tone = "neutral",
  dot = true,
  children,
  style
}) {
  const c = TONES[tone]?.color || TONES.neutral.color;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: "var(--radius-full)",
      background: `hsl(${c} / 0.1)`,
      border: `1px solid hsl(${c} / 0.2)`,
      color: `hsl(${c})`,
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: "var(--text-micro)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-widest)",
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: `hsl(${c})`
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 32,
    padding: "0 12px",
    fontSize: 13
  },
  md: {
    height: 40,
    padding: "0 20px",
    fontSize: 14
  },
  lg: {
    height: 48,
    padding: "0 28px",
    fontSize: 16
  }
};
function variantStyle(variant, hover) {
  switch (variant) {
    case "primary":
      return {
        background: `hsl(var(--primary))`,
        color: `hsl(var(--primary-foreground))`,
        border: "1px solid transparent",
        opacity: hover ? 0.9 : 1,
        boxShadow: hover ? "var(--glow-primary)" : "none"
      };
    case "secondary":
      return {
        background: hover ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
        color: `hsl(var(--foreground))`,
        border: "1px solid rgba(255,255,255,0.1)"
      };
    case "outline":
      return {
        background: hover ? "rgba(255,255,255,0.05)" : "transparent",
        color: `hsl(var(--foreground))`,
        border: "1px solid rgba(255,255,255,0.2)"
      };
    case "ghost":
      return {
        background: hover ? "rgba(255,255,255,0.1)" : "transparent",
        color: `hsl(var(--foreground))`,
        border: "1px solid transparent"
      };
    case "destructive":
      return {
        background: hover ? "#dc2626" : "#ef4444",
        color: "#fff",
        border: "1px solid transparent"
      };
    default:
      return {};
  }
}

/** Eleva Pro pill button. Mirrors web/src/components/ui/Button.tsx (tailwind-variants) and app/src/components/ui/Button.tsx (gradient TouchableOpacity), unified onto design tokens. */
function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  isLoading = false,
  icon,
  children,
  onClick,
  style,
  ...props
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled || isLoading,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: "var(--radius-full)",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      cursor: disabled || isLoading ? "not-allowed" : "pointer",
      transition: "all var(--duration-fast) var(--ease-standard)",
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? "100%" : undefined,
      ...SIZES[size],
      ...variantStyle(variant, hover),
      ...style
    }
  }, props), isLoading ? "\u2026" : icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface card — the base container used everywhere: dashboard stat tiles, student cards, bento feature tiles. Mirrors web StudentCard.tsx / dashboard bento tiles and app/src/components/ui/Card.tsx. */
function Card({
  hoverable = true,
  radius = "var(--radius-2xl)",
  children,
  style,
  ...props
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => hoverable && setHover(true),
    onMouseLeave: () => hoverable && setHover(false),
    style: {
      background: "hsl(var(--surface))",
      border: `1px solid ${hover ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
      borderRadius: radius,
      padding: "var(--space-6)",
      transition: "border-color var(--duration-standard) var(--ease-standard)",
      boxShadow: hover ? "var(--shadow-card)" : "none",
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
/** Pill toggle. Mirrors the Mensal/Anual switch in web/src/shared/components/sections/Pricing.tsx. */
function Switch({
  checked = false,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange?.(!checked),
    style: {
      width: 56,
      height: 28,
      borderRadius: "var(--radius-full)",
      position: "relative",
      border: "none",
      cursor: "pointer",
      background: checked ? "hsl(var(--primary) / 0.3)" : "rgba(255,255,255,0.1)",
      transition: "background var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 4,
      left: checked ? 32 : 4,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: checked ? "hsl(var(--primary))" : "hsl(var(--zinc-500))",
      transition: "left var(--duration-fast) var(--ease-standard)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/data/ProgressCard.jsx
try { (() => {
const COLORS = {
  success: "var(--emerald-500)",
  warning: "var(--amber-500)",
  primary: "var(--lime)"
};

/** Goal progress bar with fraction label. Mirrors app/src/components/gamification/ProgressCard.tsx. */
function ProgressCard({
  title,
  current,
  target,
  unit,
  color = "primary"
}) {
  const pct = Math.min(100, Math.round(current / target * 100));
  const c = COLORS[color] || COLORS.primary;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      padding: 18,
      background: "hsl(var(--surface))",
      border: "1px solid hsl(var(--border))",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "hsl(var(--foreground))"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: `hsl(${c})`
    }
  }, current, "/", target, " ", unit)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      borderRadius: "var(--radius-full)",
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: `hsl(${c})`,
      borderRadius: "var(--radius-full)",
      transition: "width var(--duration-standard) var(--ease-standard)"
    }
  })));
}
Object.assign(__ds_scope, { ProgressCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ProgressCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
const TREND = {
  up: "var(--emerald-500)",
  down: "var(--red-500)",
  neutral: "var(--zinc-500)"
};

/** Metric tile with trend arrow. Mirrors app/src/components/gamification/StatCard.tsx. */
function StatCard({
  label,
  value,
  trend,
  change,
  icon
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      padding: 20,
      background: "hsl(var(--surface))",
      border: "1px solid hsl(var(--border))",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "var(--tracking-widest)",
      textTransform: "uppercase",
      color: "hsl(var(--zinc-500))",
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: "hsl(var(--foreground))"
    }
  }, value), trend && change && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: `hsl(${TREND[trend]})`
    }
  }, trend === "up" ? "↑" : trend === "down" ? "↓" : "→", " ", change))), icon && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.05)",
      padding: 10,
      borderRadius: "var(--radius-lg)",
      border: "1px solid rgba(255,255,255,0.05)",
      color: "hsl(var(--muted-foreground))"
    }
  }, icon));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Centered modal. Mirrors web/src/components/ui/Dialog.tsx — blurred scrim, surface panel, close X. */
function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 420
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => e.target === e.currentTarget && onClose?.(),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth,
      background: "hsl(var(--surface))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "var(--radius-2xl)",
      boxShadow: "var(--shadow-panel)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "24px 24px 0"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20,
      color: "hsl(var(--foreground))"
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 13,
      color: "hsl(var(--muted-foreground))"
    }
  }, description)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "hsl(var(--muted-foreground))",
      cursor: "pointer",
      fontSize: 18,
      lineHeight: 1,
      padding: 4
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, children)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONES = {
  success: "var(--emerald-500)",
  error: "var(--red-500)",
  info: "var(--cyber-blue)"
};

/** Toast notification. Mirrors the `sonner` Toaster used in web/src/app/layout.tsx (richColors, bottom-right). */
function Toast({
  tone = "info",
  title,
  description
}) {
  const c = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      width: 320,
      padding: 16,
      background: "hsl(var(--surface))",
      border: `1px solid hsl(${c} / 0.3)`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      marginTop: 5,
      borderRadius: "50%",
      background: `hsl(${c})`,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "hsl(var(--foreground))"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "hsl(var(--muted-foreground))",
      marginTop: 2
    }
  }, description)));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
/** Label + hint/error wrapper around a form control. Mirrors web/src/components/ui/FormField.tsx. */
function FormField({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children
}) {
  const footer = error || hint;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "hsl(var(--foreground))"
    }
  }, label, optional && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6,
      fontSize: 11,
      fontWeight: 400,
      color: "hsl(var(--muted-foreground))"
    }
  }, "(opcional)")), children, footer && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: error ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"
    }
  }, footer));
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input. Mirrors web/src/components/ui/Input.tsx and app/src/components/ui/Input.tsx — translucent surface, lime focus ring. */
function Input({
  label,
  error,
  leftIcon,
  style,
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "hsl(var(--foreground))"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)",
      color: "hsl(var(--muted-foreground))"
    }
  }, leftIcon), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: e => {
      setFocused(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      props.onBlur?.(e);
    },
    style: {
      width: "100%",
      height: 44,
      borderRadius: "var(--radius-lg)",
      padding: leftIcon ? "0 14px 0 38px" : "0 14px",
      background: "rgba(255,255,255,0.05)",
      color: "hsl(var(--foreground))",
      fontSize: 14,
      border: `1px solid ${error ? "hsl(var(--destructive) / 0.7)" : focused ? "hsl(var(--primary))" : "rgba(255,255,255,0.1)"}`,
      outline: "none",
      boxSizing: "border-box",
      ...style
    }
  }, props))), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "hsl(var(--destructive))"
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNavItem.jsx
try { (() => {
/** Sidebar nav item with animated active pill. Mirrors the nav items in web/src/app/dashboard/layout.tsx (framer-motion layoutId="active-nav"). */
function SidebarNavItem({
  icon,
  label,
  active = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onClick?.();
    },
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "16px 24px",
      borderRadius: "var(--radius-lg)",
      textDecoration: "none",
      fontFamily: "var(--font-sans)",
      background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
      border: active ? "1px solid hsl(var(--primary) / 0.2)" : "1px solid transparent",
      boxShadow: active ? "0 0 20px rgba(204,255,0,0.05)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      display: "flex"
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      fontStyle: active ? "italic" : "normal",
      color: active ? "hsl(var(--foreground))" : "hsl(var(--zinc-500))"
    }
  }, label), active && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 24,
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: "hsl(var(--primary))",
      boxShadow: "0 0 8px #ccff00"
    }
  }));
}
Object.assign(__ds_scope, { SidebarNavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNavItem.jsx", error: String((e && e.message) || e) }); }

// mobile/kit/hero-objects.js
try { (() => {
/* Objetos-herói em CSS puro: volume, brilho e sombra de palco, sem depender de render externo.
   Carregar como <script type="text/babel" src="hero-objects.js"></script> — expõe em window. */

function Pedestal({
  size = 230,
  glow = "hsl(var(--primary))",
  children,
  lift = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: size * 0.95,
      height: size * 0.62,
      borderRadius: "50%",
      background: `radial-gradient(closest-side, color-mix(in srgb, ${glow} 38%, transparent) 0%, transparent 72%)`,
      filter: "blur(16px)",
      bottom: size * 0.06
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: size * 0.14,
      width: size * 0.52,
      height: size * 0.09,
      borderRadius: "50%",
      background: "rgba(0,0,0,.55)",
      filter: "blur(10px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: size * 0.13,
      width: size * 0.6,
      height: size * 0.11,
      borderRadius: "50%",
      border: `1px dashed color-mix(in srgb, ${glow} 55%, transparent)`,
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      transform: `translateY(${-lift}px)`,
      filter: "drop-shadow(0 18px 26px rgba(0,0,0,.55))"
    }
  }, children));
}

/* Relógio esportivo em 3/4, pulseira em silicone e coroa lateral */
function WatchObject({
  scale = 1,
  accent = "hsl(var(--primary))"
}) {
  const band = {
    width: 74,
    background: `linear-gradient(100deg, color-mix(in srgb, ${accent} 88%, #000) 0%, ${accent} 42%, color-mix(in srgb, ${accent} 72%, #fff) 60%, color-mix(in srgb, ${accent} 80%, #000) 100%)`
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${scale}) rotate(-7deg)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...band,
      height: 64,
      borderRadius: "26px 26px 12px 12px",
      boxShadow: "inset 0 -8px 14px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.35)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 104,
      height: 124,
      marginTop: -10,
      marginBottom: -10,
      borderRadius: 32,
      background: "linear-gradient(145deg,#E8EAEE 0%,#9BA1AB 26%,#5A606B 52%,#C8CDD5 78%,#7A8089 100%)",
      padding: 7,
      boxShadow: "0 16px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.85)",
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -6,
      top: 34,
      width: 8,
      height: 20,
      borderRadius: 3,
      background: "linear-gradient(180deg,#D7DBE1,#6E747E)",
      boxShadow: "1px 1px 3px rgba(0,0,0,.5)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -5,
      top: 62,
      width: 6,
      height: 26,
      borderRadius: 3,
      background: "linear-gradient(180deg,#C3C8D0,#666C76)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      borderRadius: 26,
      background: "radial-gradient(120% 90% at 20% 8%, #2B2F36 0%, #0A0B0D 60%)",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(128deg, rgba(255,255,255,.22) 0%, transparent 34%, transparent 66%, rgba(255,255,255,.08) 100%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 99,
      border: `5px solid ${accent}`,
      borderRightColor: "rgba(255,255,255,.14)",
      borderBottomColor: "rgba(255,255,255,.14)",
      transform: "rotate(28deg)",
      boxShadow: `0 0 16px color-mix(in srgb, ${accent} 60%, transparent)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 16,
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: ".14em",
      color: "rgba(255,255,255,.62)"
    }
  }, "9:41"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...band,
      height: 70,
      borderRadius: "12px 12px 30px 30px",
      boxShadow: "inset 0 8px 14px rgba(0,0,0,.35), inset 0 -2px 0 rgba(255,255,255,.2)"
    }
  }));
}

/* Cadeado — usado nas telas de consentimento e privacidade */
function LockObject({
  scale = 1,
  accent = "hsl(var(--primary))"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${scale}) rotate(-5deg)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 74,
      height: 74,
      borderRadius: "99px 99px 0 0",
      border: "15px solid",
      borderColor: "#D8DCE3 #B7BCC5 transparent #B7BCC5",
      borderBottom: "none",
      marginBottom: -10,
      boxShadow: "inset 0 2px 0 rgba(255,255,255,.9), 0 6px 12px rgba(0,0,0,.4)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 132,
      height: 104,
      borderRadius: 26,
      background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 68%, #fff) 0%, ${accent} 34%, color-mix(in srgb, ${accent} 78%, #000) 72%, color-mix(in srgb, ${accent} 55%, #000) 100%)`,
      boxShadow: `0 18px 32px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -10px 18px rgba(0,0,0,.28)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 9,
      left: 14,
      right: 40,
      height: 26,
      borderRadius: "99px",
      background: "rgba(255,255,255,.3)",
      filter: "blur(7px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 99,
      background: "rgba(0,0,0,.55)",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,.7)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 7,
      top: 18,
      width: 8,
      height: 18,
      borderRadius: "0 0 4px 4px",
      background: "rgba(0,0,0,.55)"
    }
  }))));
}

/* Halter — telas de treino e resumo */
function DumbbellObject({
  scale = 1,
  accent = "hsl(var(--primary))"
}) {
  const plate = (w, h, r) => ({
    width: w,
    height: h,
    borderRadius: r,
    background: "linear-gradient(145deg,#4A4F58 0%,#22252B 40%,#6A7079 72%,#14161A 100%)",
    boxShadow: "inset 0 2px 0 rgba(255,255,255,.35), 0 10px 20px rgba(0,0,0,.5)"
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${scale}) rotate(-14deg)`,
      display: "flex",
      alignItems: "center",
      gap: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: plate(30, 92, 10)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...plate(22, 72, 8),
      marginLeft: -3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 74,
      height: 22,
      background: "linear-gradient(180deg,#E4E7EC 0%,#A8AEB8 38%,#5D636D 72%,#8E949E 100%)",
      boxShadow: "inset 0 2px 0 rgba(255,255,255,.8), 0 8px 16px rgba(0,0,0,.45)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "4px 8px",
      background: `repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 2px, transparent 2px 6px)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...plate(22, 72, 8),
      marginRight: -3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: plate(30, 92, 10)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 120,
      height: 8,
      borderRadius: 99,
      background: accent,
      opacity: .3,
      filter: "blur(9px)",
      bottom: -4
    }
  }));
}

/* Esfera luminosa — coração, chama, gota: um objeto para métricas vitais */
function OrbObject({
  scale = 1,
  color = "hsl(var(--primary))",
  icon = "heart-pulse",
  glyph = 26
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${scale})`,
      position: "relative",
      width: 128,
      height: 128,
      borderRadius: 99,
      background: `radial-gradient(circle at 32% 26%, color-mix(in srgb, ${color} 30%, #fff) 0%, ${color} 38%, color-mix(in srgb, ${color} 72%, #000) 78%, color-mix(in srgb, ${color} 45%, #000) 100%)`,
      boxShadow: `inset 0 -14px 26px rgba(0,0,0,.4), inset 0 8px 18px rgba(255,255,255,.28), 0 20px 40px -10px color-mix(in srgb, ${color} 60%, transparent)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 14,
      left: 22,
      width: 44,
      height: 26,
      borderRadius: "50%",
      background: "rgba(255,255,255,.55)",
      filter: "blur(7px)"
    }
  }), /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      width: glyph * 2,
      height: glyph * 2,
      color: "rgba(255,255,255,.92)",
      filter: "drop-shadow(0 3px 6px rgba(0,0,0,.4))"
    }
  }));
}

/* Bicicleta / esteira / elíptico: silhueta em arcos com halo, para o palco do cardio */
function CardioObject({
  scale = 1,
  accent = "hsl(var(--primary))",
  kind = "bike"
}) {
  const ring = (s, t, o) => ({
    position: "absolute",
    width: s,
    height: s,
    borderRadius: 99,
    border: `${t}px solid ${accent}`,
    opacity: o,
    boxShadow: `0 0 22px color-mix(in srgb, ${accent} 70%, transparent)`
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scale(${scale})`,
      position: "relative",
      width: 230,
      height: 150,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, kind === "bike" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...ring(96, 7, 1),
      left: 2,
      bottom: 6,
      borderRightColor: "rgba(255,255,255,.12)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...ring(96, 7, 1),
      right: 2,
      bottom: 6,
      borderLeftColor: "rgba(255,255,255,.12)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 44,
      bottom: 52,
      width: 142,
      height: 6,
      borderRadius: 99,
      background: "linear-gradient(90deg,#C9CED6,#6B7079)",
      transform: "rotate(-9deg)",
      boxShadow: "0 6px 14px rgba(0,0,0,.5)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 70,
      bottom: 46,
      width: 92,
      height: 6,
      borderRadius: 99,
      background: "linear-gradient(90deg,#8E949E,#4A4F58)",
      transform: "rotate(26deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 52,
      bottom: 48,
      width: 6,
      height: 58,
      borderRadius: 99,
      background: "linear-gradient(180deg,#D7DBE1,#5D636D)",
      transform: "rotate(18deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 56,
      bottom: 52,
      width: 6,
      height: 52,
      borderRadius: 99,
      background: "linear-gradient(180deg,#D7DBE1,#5D636D)",
      transform: "rotate(-16deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 104,
      bottom: 44,
      width: 26,
      height: 26,
      borderRadius: 99,
      background: accent,
      boxShadow: `0 0 20px ${accent}`
    }
  })), kind === "treadmill" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 22,
      width: 186,
      height: 22,
      borderRadius: 12,
      background: "linear-gradient(180deg,#3A3F47,#15171B)",
      boxShadow: "inset 0 2px 0 rgba(255,255,255,.2), 0 12px 24px rgba(0,0,0,.55)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 30,
      width: 160,
      height: 6,
      borderRadius: 99,
      background: `repeating-linear-gradient(90deg, ${accent} 0 8px, transparent 8px 18px)`,
      opacity: .8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: 40,
      right: 38,
      width: 6,
      height: 74,
      borderRadius: 99,
      background: "linear-gradient(180deg,#D7DBE1,#5D636D)",
      transform: "rotate(10deg)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 12,
      right: 22,
      width: 66,
      height: 44,
      borderRadius: 10,
      background: "radial-gradient(120% 90% at 20% 8%, #2B2F36, #0A0B0D)",
      border: "2px solid #5D636D",
      boxShadow: `0 0 18px color-mix(in srgb, ${accent} 40%, transparent)`
    }
  })), kind === "swim" && /*#__PURE__*/React.createElement(React.Fragment, null, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "absolute",
      bottom: 34 + i * 26,
      width: 170 - i * 26,
      height: 5,
      borderRadius: 99,
      background: accent,
      opacity: .28 + i * 0.26,
      boxShadow: `0 0 18px color-mix(in srgb, ${accent} 60%, transparent)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 26,
      width: 54,
      height: 54,
      borderRadius: 99,
      background: `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${accent} 25%, #fff), ${accent} 52%, color-mix(in srgb, ${accent} 60%, #000))`,
      boxShadow: `0 0 26px color-mix(in srgb, ${accent} 70%, transparent)`
    }
  })));
}
Object.assign(window, {
  Pedestal,
  WatchObject,
  LockObject,
  DumbbellObject,
  OrbObject,
  CardioObject
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/kit/hero-objects.js", error: String((e && e.message) || e) }); }

// mobile/kit/kit.jsx
try { (() => {
/* ElevaPro · kit compartilhado do app mobile (base: onb-kit.jsx do onboarding + compare.jsx do uso diário + variações dos fluxos). */
(() => {
  const I = (n, s = 20, c) => /*#__PURE__*/React.createElement("i", {
    "data-lucide": n,
    style: {
      width: s,
      height: s,
      display: "block",
      color: c,
      flexShrink: 0
    }
  });
  const P = "hsl(var(--primary))",
    PF = "hsl(var(--primary-foreground))",
    PT = "hsl(var(--primary-text))";
  const AMB = "hsl(var(--amber-500))",
    BLU = "hsl(var(--secondary))",
    PNK = "hsl(var(--accent))",
    RED = "hsl(var(--destructive))",
    OK = "hsl(var(--success))";
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const mono = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "var(--ios-label3)"
  };
  function StatusBar() {
    return /*#__PURE__*/React.createElement("div", {
      className: "statusbar"
    }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, I("signal", 16, "var(--ios-label)"), I("wifi", 16, "var(--ios-label)"), I("battery-full", 20, "var(--ios-label)")));
  }
  function Phone({
    children,
    footer,
    overlay,
    tabs
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "phone"
    }, /*#__PURE__*/React.createElement("div", {
      className: "island"
    }), /*#__PURE__*/React.createElement(StatusBar, null), children, footer, tabs && /*#__PURE__*/React.createElement(TabBar, {
      active: typeof tabs === "string" ? tabs : undefined
    }), overlay, /*#__PURE__*/React.createElement("div", {
      className: "homebar"
    }));
  }
  function Scroll({
    children,
    pb = 150
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "scroll",
      style: {
        paddingBottom: pb
      }
    }, children);
  }
  function Row({
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        ...style
      }
    }, children);
  }
  function BotaoRedondo({
    icon = "chevron-left",
    size = 38
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        width: size,
        height: size,
        borderRadius: 99,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, I(icon, size * 0.47, "var(--ios-label)"));
  }
  function StepBar({
    current,
    total = 5
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 9
      },
      "aria-label": `Etapa ${current} de ${total}`
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex",
        gap: 5
      }
    }, Array.from({
      length: total
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        height: 4,
        borderRadius: 99,
        background: i < current ? P : "var(--glass-strong)"
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ios-label3)",
        letterSpacing: ".06em",
        whiteSpace: "nowrap"
      }
    }, current, " de ", total));
  }
  function OnbHeader({
    step,
    total = 5,
    skip,
    back = true
  }) {
    return /*#__PURE__*/React.createElement(Row, {
      style: {
        paddingTop: 14,
        gap: 12,
        minHeight: 52
      }
    }, back && /*#__PURE__*/React.createElement(BotaoRedondo, null), step ? /*#__PURE__*/React.createElement(StepBar, {
      current: step,
      total: total
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), skip && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ios-label2)",
        whiteSpace: "nowrap"
      }
    }, skip === true ? "Pular por enquanto" : skip));
  }
  function Title({
    children,
    sub,
    size = 28,
    eyebrow
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22
      }
    }, eyebrow && /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        marginBottom: 8
      }
    }, eyebrow), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: "-.03em",
        color: "var(--ios-label)",
        textWrap: "pretty"
      }
    }, children), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.4,
        color: "var(--ios-label2)",
        marginTop: 8,
        textWrap: "pretty"
      }
    }, sub));
  }
  function Label({
    children,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        margin: "20px 2px 9px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: mono
    }, children), right && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label3)"
      }
    }, right));
  }
  function Vidro({
    children,
    style,
    strong,
    active
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        padding: 14,
        ...(strong ? {
          background: "var(--glass-strong)"
        } : null),
        ...(active ? {
          borderColor: tint(P, 50)
        } : null),
        ...style
      }
    }, children);
  }
  function CaixaDeIcone({
    icon,
    tone = P,
    size = 34,
    solid
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: solid ? tone : tint(tone, 16),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, I(icon, Math.round(size * 0.5), solid ? PF : tone));
  }
  function GlassChoice({
    icon,
    title,
    sub,
    active
  }) {
    return /*#__PURE__*/React.createElement(Vidro, {
      active: active,
      style: {
        padding: 13,
        marginBottom: 9,
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 11,
        background: active ? P : "var(--glass-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, I(icon, 17, active ? PF : "var(--ios-label2)")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--ios-label)",
        letterSpacing: "-.01em"
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label2)",
        marginTop: 2
      }
    }, sub)), I(active ? "circle-check" : "circle", 19, active ? PT : "var(--ios-label3)"));
  }
  /* novo · GlassChoice compacto (3 lado a lado) */
  function ChoiceTile({
    icon,
    title,
    active
  }) {
    return /*#__PURE__*/React.createElement(Vidro, {
      active: active,
      style: {
        flex: 1,
        padding: "12px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: "flex-end",
        marginBottom: -14
      }
    }, I(active ? "circle-check" : "circle", 16, active ? PT : "var(--ios-label3)")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 11,
        background: active ? P : "var(--glass-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, I(icon, 17, active ? PF : "var(--ios-label2)")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, title));
  }
  /* Chip de escolha única: ativo pintado na primária */
  function ChipPick({
    children,
    on,
    w
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 40,
        minWidth: w,
        padding: "0 14px",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        background: on ? P : "var(--glass-strong)",
        color: on ? PF : "var(--ios-label)",
        border: `1px solid ${on ? P : "var(--glass-brd)"}`,
        flex: w ? 1 : "none"
      },
      "aria-pressed": on
    }, children);
  }
  /* novo · Chip de múltipla escolha: tique + borda primária */
  function ChipMulti({
    children,
    on
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 36,
        padding: on ? "0 13px 0 9px" : "0 13px",
        borderRadius: 99,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        background: on ? tint(P, 14) : "var(--glass-strong)",
        color: "var(--ios-label)",
        border: `1px solid ${on ? P : "var(--glass-brd)"}`
      },
      "aria-pressed": on
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 18,
        borderRadius: 99,
        background: P,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, I("check", 12, PF)), children);
  }
  function Chips({
    children,
    gap = 7
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap
      }
    }, children);
  }
  function GlassSegmented({
    opts,
    value
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 16
      }
    }, opts.map(o => /*#__PURE__*/React.createElement("div", {
      key: o,
      style: {
        flex: 1,
        height: 34,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11.5,
        fontWeight: 700,
        background: o === value ? P : "transparent",
        color: o === value ? PF : "var(--ios-label2)"
      }
    }, o)));
  }
  function Campo({
    label,
    value,
    placeholder,
    unit,
    error,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        marginBottom: 6,
        paddingLeft: 2
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 52,
        padding: "0 14px",
        borderRadius: 14,
        background: "var(--field)",
        border: `1px solid ${error ? RED : "var(--field-brd)"}`,
        boxShadow: error ? `0 0 0 3px ${tint(RED, 16)}` : "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: value ? 800 : 500,
        color: value ? "var(--ios-label)" : "var(--ios-label3)",
        letterSpacing: "-.02em"
      }
    }, value || placeholder), unit && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label3)",
        fontWeight: 600
      }
    }, unit)), error && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        alignItems: "flex-start",
        marginTop: 7,
        fontSize: 11.5,
        lineHeight: 1.35,
        color: "var(--ios-label2)"
      }
    }, I("circle-alert", 14, RED), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--ios-label)"
      }
    }, "Fora da faixa."), " ", error)));
  }
  function BarraDeProgresso({
    pct,
    color = P,
    h = 6
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: h,
        borderRadius: 99,
        background: "var(--glass-strong)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${pct}%`,
        height: "100%",
        background: color,
        borderRadius: 99
      }
    }));
  }
  /* novo · Precisão do plano */
  function Precisao({
    pct,
    nivel
  }) {
    return /*#__PURE__*/React.createElement(Vidro, {
      style: {
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement(Row, {
      style: {
        justifyContent: "space-between",
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: mono
    }, "Precis\xE3o do plano"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, nivel, " \xB7 ", pct, "%")), /*#__PURE__*/React.createElement(BarraDeProgresso, {
      pct: pct
    }));
  }
  function Nota({
    icon = "info",
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        fontSize: 11.5,
        lineHeight: 1.4,
        color: "var(--ios-label2)",
        ...style
      }
    }, I(icon, 15, "var(--ios-label3)"), /*#__PURE__*/React.createElement("span", null, children));
  }
  function Anel({
    pct,
    size = 118,
    stroke = 10,
    value,
    unit,
    sub
  }) {
    const r = (size - stroke) / 2,
      c = 2 * Math.PI * r;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      style: {
        transform: "rotate(-90deg)"
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: "var(--glass-strong)",
      strokeWidth: stroke
    }), /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: P,
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeDasharray: `${c * pct / 100} ${c}`
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: size * 0.2,
        fontWeight: 800,
        letterSpacing: "-.04em",
        color: "var(--ios-label)",
        lineHeight: 1
      }
    }, value), unit && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--ios-label2)",
        marginTop: 3
      }
    }, unit), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 8.5,
        marginTop: 3
      }
    }, sub)));
  }
  function LinhaDeVidro({
    icon,
    tone = P,
    title,
    sub,
    right,
    first
  }) {
    return /*#__PURE__*/React.createElement(Row, {
      style: {
        padding: "11px 0",
        borderTop: first ? "none" : "1px solid var(--glass-brd)"
      }
    }, icon && /*#__PURE__*/React.createElement(CaixaDeIcone, {
      icon: icon,
      tone: tone,
      size: 32
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--ios-label)",
        letterSpacing: "-.01em"
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label2)",
        marginTop: 2,
        lineHeight: 1.35
      }
    }, sub)), right);
  }
  /* novo · Passo da tela de espera */
  function PassoDeEspera({
    state,
    label
  }) {
    const M = {
      done: ["Feito", P, "check", PF],
      active: ["Agora", "transparent", "loader-circle", PT],
      todo: ["A seguir", "transparent", null, null],
      error: ["Parou", tint(RED, 16), "x", RED]
    }[state];
    return /*#__PURE__*/React.createElement(Row, {
      style: {
        padding: "12px 0",
        borderTop: "1px solid var(--glass-brd)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 99,
        background: M[1],
        border: state === "done" ? "none" : `1.5px solid ${state === "active" ? P : state === "error" ? RED : "var(--glass-brd)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, M[2] && I(M[2], 14, M[3])), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        fontWeight: state === "todo" ? 500 : 700,
        color: state === "todo" ? "var(--ios-label3)" : "var(--ios-label)"
      }
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 9,
        color: state === "todo" ? "var(--ios-label3)" : "var(--ios-label2)"
      }
    }, M[0]));
  }
  function BotaoDeDestaque({
    children,
    icon = "arrow-right",
    disabled,
    hint,
    bottom = 40
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom,
        zIndex: 6
      }
    }, hint && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11.5,
        color: "var(--ios-label2)",
        marginBottom: 9
      }
    }, hint), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 54,
        borderRadius: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        fontWeight: 800,
        fontSize: 14.5,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        background: disabled ? "var(--ios-bg)" : P,
        color: disabled ? "var(--ios-label3)" : PF,
        border: disabled ? "1px solid var(--glass-brd)" : "none",
        boxShadow: disabled ? "none" : "0 10px 30px -8px hsl(var(--primary) / .7)",
        position: "relative",
        overflow: "hidden"
      },
      "aria-disabled": disabled
    }, disabled && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "var(--glass-strong)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative"
      }
    }, children), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative"
      }
    }, I(disabled ? "lock" : icon, 17, disabled ? "var(--ios-label3)" : PF))));
  }
  function BotaoSecundario({
    children,
    icon,
    bottom = 40,
    text
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom,
        zIndex: 6,
        height: text ? 36 : 48,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: text ? 13.5 : 12.5,
        fontWeight: text ? 600 : 800,
        letterSpacing: text ? 0 : ".06em",
        textTransform: text ? "none" : "uppercase",
        color: text ? "var(--ios-label2)" : "var(--ios-label)",
        background: text ? "transparent" : "var(--ios-bg)",
        border: text ? "none" : "1px solid var(--glass-brd)",
        overflow: "hidden"
      }
    }, !text && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "var(--glass-strong)"
      }
    }), icon && /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative"
      }
    }, I(icon, 15, "var(--ios-label)")), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative"
      }
    }, children));
  }
  function BarraDeDuasAcoes({
    sec,
    secIcon,
    pri,
    priIcon,
    bottom = 40
  }) {
    const b = {
      height: 42,
      borderRadius: 13,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom,
        zIndex: 6,
        display: "flex",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...b,
        padding: "0 16px",
        background: "var(--ios-bg)",
        border: "1px solid var(--glass-brd)",
        color: "var(--ios-label)",
        position: "relative",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "var(--glass-strong)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: "relative",
        display: "flex",
        gap: 7,
        alignItems: "center"
      }
    }, I(secIcon, 15, "var(--ios-label)"), sec)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...b,
        flex: 1,
        background: P,
        color: PF,
        boxShadow: "0 10px 26px -10px hsl(var(--primary) / .8)"
      }
    }, I(priIcon, 15, PF), pri));
  }
  function Fade() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 150,
        zIndex: 4,
        background: "linear-gradient(180deg,transparent,var(--ios-bg) 55%)",
        pointerEvents: "none"
      }
    });
  }
  function GlassSheet({
    title,
    sub,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 8,
        background: "var(--scrim)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        borderRadius: "28px 28px 0 0",
        padding: "10px 18px 40px",
        background: "var(--sheet)",
        borderBottom: "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 5,
        borderRadius: 99,
        background: "var(--ios-label3)",
        margin: "0 auto 14px"
      }
    }), /*#__PURE__*/React.createElement(Row, {
      style: {
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: "-.03em",
        color: "var(--ios-label)"
      }
    }, title), /*#__PURE__*/React.createElement(BotaoRedondo, {
      icon: "x",
      size: 32
    })), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label2)",
        marginTop: 4
      }
    }, sub), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, children)));
  }
  /* novo · Linha de ajuste "antes → depois" */
  function AntesDepois({
    icon,
    title,
    antes,
    depois,
    delta,
    first
  }) {
    const up = delta.startsWith("+");
    return /*#__PURE__*/React.createElement(Row, {
      style: {
        padding: "11px 0",
        borderTop: first ? "none" : "1px solid var(--glass-brd)",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
      icon: icon,
      size: 32
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 3,
        fontSize: 11.5,
        color: "var(--ios-label2)",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        textDecoration: "line-through",
        color: "var(--ios-label3)"
      }
    }, antes), I("arrow-right", 12, "var(--ios-label3)"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--ios-label)",
        fontWeight: 600
      }
    }, depois))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: 99,
        background: "var(--glass-strong)",
        color: "var(--ios-label)",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, I(up ? "arrow-up" : delta === "0 kcal" ? "equal" : "arrow-down", 11, "var(--ios-label2)"), delta));
  }
  /* Barra real do app (components/navigation/TabBar.tsx): 3 abas | "+" central | 3 abas */
  function TabBar({
    active = "Início"
  }) {
    const A = [["house", "Início"], ["dumbbell", "Treinos"], ["utensils-crossed", "Nutrição"]],
      B = [["chart-no-axes-column", "Progresso"], ["watch", "Saúde"], ["trophy", "Ranking"]];
    const item = ([i, l]) => {
      const on = l === active;
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        className: "tabitem" + (on ? " on" : ""),
        style: {
          flex: 1,
          color: on ? PT : "var(--ios-label3)",
          fontWeight: on ? 700 : 600
        }
      }, I(i, 23, on ? PT : "var(--ios-label3)"), l);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "tabbar",
      style: {
        padding: "12px 8px 0",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex"
      }
    }, A.map(item)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 68,
        height: 68,
        marginTop: -28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      "aria-label": "A\xE7\xF5es r\xE1pidas"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        borderRadius: 99,
        background: P,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 26px -10px hsl(var(--primary) / .8)"
      }
    }, I("plus", 32, PF))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex"
      }
    }, B.map(item)));
  }
  const UDI = (n, s = 20, c) => /*#__PURE__*/React.createElement("i", {
    "data-lucide": n,
    style: {
      width: s,
      height: s,
      display: "block",
      color: c,
      flexShrink: 0
    }
  });
  const UDmono = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "hsl(var(--muted-foreground))"
  };
  /* Barra real do app: components/navigation/TabBar.tsx */
  function UDTabBar({
    active = "Início"
  }) {
    const A = [["house", "Início"], ["dumbbell", "Treinos"], ["utensils-crossed", "Nutrição"]],
      B = [["chart-no-axes-column", "Progresso"], ["watch", "Saúde"], ["trophy", "Ranking"]];
    const PT = "hsl(var(--primary-text))";
    const item = ([i, l]) => {
      const on = l === active;
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        className: "tabitem" + (on ? " on" : ""),
        style: {
          flex: 1,
          color: on ? PT : "var(--ios-label3)",
          fontWeight: on ? 700 : 600
        }
      }, UDI(i, 23, on ? PT : "var(--ios-label3)"), l);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "tabbar",
      style: {
        padding: "12px 8px 0",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex"
      }
    }, A.map(item)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 68,
        height: 68,
        marginTop: -28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        borderRadius: 99,
        background: "hsl(var(--primary))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 26px -10px hsl(var(--primary) / .8)"
      }
    }, UDI("plus", 32, "hsl(var(--primary-foreground))"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: "flex"
      }
    }, B.map(item)));
  }
  /* Folha de vidro genérica */
  function UDSheet({
    title,
    sub,
    children,
    h
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "var(--scrim)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        borderRadius: "28px 28px 0 0",
        padding: "10px 18px 40px",
        background: "var(--ios-bg)",
        borderBottom: "none",
        minHeight: h
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 5,
        borderRadius: 99,
        background: "var(--ios-label3)",
        margin: "0 auto 14px"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 21,
        fontWeight: 800,
        letterSpacing: "-.03em",
        color: "var(--ios-label)"
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        width: 32,
        height: 32,
        borderRadius: 99,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, UDI("x", 15, "var(--ios-label)"))), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label2)",
        marginTop: 4,
        lineHeight: 1.4
      }
    }, sub), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, children)));
  }
  function UDOpt({
    icon,
    title,
    sub,
    right,
    first,
    strong
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
        borderTop: first ? "none" : "1px solid var(--glass-brd)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 11,
        background: strong ? "hsl(var(--primary))" : "var(--glass-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, UDI(icon, 17, strong ? "hsl(var(--primary-foreground))" : "var(--ios-label)")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label2)",
        marginTop: 2,
        lineHeight: 1.35
      }
    }, sub)), right || UDI("chevron-right", 16, "var(--ios-label3)"));
  }
  function UDToast({
    icon = "check",
    children,
    bottom = 104
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        bottom,
        zIndex: 15,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 16px 10px 10px",
        borderRadius: 99,
        background: "var(--ios-bg)",
        border: "1px solid var(--glass-brd)",
        boxShadow: "0 14px 30px -10px rgba(0,0,0,.5)",
        whiteSpace: "nowrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 99,
        background: "hsl(var(--primary))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, UDI(icon, 14, "hsl(var(--primary-foreground))")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ios-label)"
      }
    }, children));
  }
  /* Mapa muscular: silhueta frente/costas, intensidade lime pelo volume */
  const UD_MUS = {
    front: {
      peito: "M60 62 Q75 56 88 62 L88 82 Q74 88 60 82 Z|M112 62 Q125 56 140 62 L140 82 Q126 88 112 82 Z",
      ombros: "M46 58 Q52 50 62 54 L58 74 Q48 72 46 58 Z|M154 58 Q148 50 138 54 L142 74 Q152 72 154 58 Z",
      biceps: "M44 78 L56 78 L54 108 L42 106 Z|M156 78 L144 78 L146 108 L158 106 Z",
      abdomen: "M86 90 L114 90 L112 138 L88 138 Z",
      quadriceps: "M74 150 L98 150 L96 214 L76 214 Z|M102 150 L126 150 L124 214 L104 214 Z",
      panturrilhas: "M78 226 L94 226 L92 270 L80 270 Z|M106 226 L122 226 L120 270 L108 270 Z"
    },
    back: {
      costas: "M64 60 L136 60 L128 112 L72 112 Z",
      ombros: "M46 58 Q52 50 62 54 L58 74 Q48 72 46 58 Z|M154 58 Q148 50 138 54 L142 74 Q152 72 154 58 Z",
      triceps: "M44 78 L56 78 L54 108 L42 106 Z|M156 78 L144 78 L146 108 L158 106 Z",
      lombar: "M78 114 L122 114 L118 140 L82 140 Z",
      gluteos: "M76 142 L124 142 L124 168 L76 168 Z",
      posteriores: "M76 172 L98 172 L96 222 L78 222 Z|M102 172 L124 172 L122 222 L104 222 Z",
      panturrilhas: "M78 226 L94 226 L92 270 L80 270 Z|M106 226 L122 226 L120 270 L108 270 Z"
    }
  };
  const UD_BODY = "M100 10 a14 16 0 1 1 -0.1 0 Z M84 42 L116 42 L118 50 L150 54 Q160 58 160 76 L162 112 L152 114 L144 82 L140 112 L132 146 L128 222 L124 276 L104 276 L102 160 L98 160 L96 276 L76 276 L72 222 L68 146 L60 112 L56 82 L48 114 L38 112 L40 76 Q40 58 50 54 L82 50 Z";
  function UDBody({
    side,
    vol
  }) {
    return /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 200 284",
      width: "100%",
      style: {
        display: "block"
      }
    }, /*#__PURE__*/React.createElement("path", {
      d: UD_BODY,
      fill: "var(--glass-strong)",
      stroke: "var(--glass-brd)"
    }), Object.entries(UD_MUS[side]).map(([k, d]) => d.split("|").map((p, i) => /*#__PURE__*/React.createElement("path", {
      key: k + i,
      d: p,
      fill: vol[k] ? `hsl(var(--primary) / ${0.25 + 0.75 * vol[k]})` : "transparent",
      stroke: vol[k] ? "hsl(var(--primary))" : "var(--glass-brd)",
      strokeWidth: ".8",
      strokeLinejoin: "round"
    }))));
  }
  function UDMapa({
    vol,
    legend,
    compact
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, ["front", "back"].map(s => /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        flex: 1,
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement(UDBody, {
      side: s,
      vol: vol
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...UDmono,
        fontSize: 9,
        color: "var(--ios-label3)",
        marginTop: 4
      }
    }, s === "front" ? "Frente" : "Costas")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        fontSize: 10.5,
        color: "var(--ios-label2)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "Menos volume"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        borderRadius: 99,
        background: "linear-gradient(90deg,hsl(var(--primary) / .25),hsl(var(--primary)))"
      }
    }), /*#__PURE__*/React.createElement("span", null, "Mais")), legend && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: compact ? 8 : 12
      }
    }, legend.map(([g, s, p], i) => /*#__PURE__*/React.createElement("div", {
      key: g,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
        borderTop: i ? "1px solid var(--glass-brd)" : "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--ios-label)"
      }
    }, g), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 90,
        height: 5,
        borderRadius: 99,
        background: "var(--glass-strong)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${p}%`,
        height: "100%",
        background: "hsl(var(--primary))"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 62,
        textAlign: "right",
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, s)))));
  }
  /* Comparação Atual × Proposta, escuro e claro */
  function Compare({
    id,
    title,
    nota,
    atual,
    proposta,
    novo
  }) {
    const both = (el, lab) => /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...UDmono,
        fontSize: 12,
        color: lab === "Atual" ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"
      }
    }, lab), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14
      }
    }, ["", "light"].map(t => /*#__PURE__*/React.createElement("div", {
      key: t,
      className: t,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...UDmono,
        fontSize: 9
      }
    }, t ? "Claro" : "Escuro"), el))));
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": id,
      style: {
        marginBottom: 70
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        padding: "4px 9px",
        borderRadius: 99,
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700
      }
    }, id), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: "-.02em",
        color: "hsl(var(--foreground))"
      }
    }, title), novo && /*#__PURE__*/React.createElement("span", {
      style: {
        ...UDmono,
        padding: "3px 8px",
        borderRadius: 99,
        border: "1px solid hsl(var(--border))"
      }
    }, "Nova")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "hsl(var(--muted-foreground))",
        marginBottom: 18,
        maxWidth: 1100
      }
    }, nota), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 40,
        alignItems: "flex-start"
      }
    }, atual && both(atual, "Atual"), atual && /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: "center",
        width: 44,
        height: 44,
        borderRadius: 99,
        border: "1px solid hsl(var(--border))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, UDI("arrow-right", 20, "hsl(var(--primary))")), both(proposta, "Proposta")));
  }
  function UDPage({
    title,
    sub,
    children
  }) {
    React.useEffect(() => {
      window.lucide?.createIcons();
    });
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: "-.03em",
        color: "hsl(var(--foreground))",
        marginBottom: 6
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        color: "hsl(var(--muted-foreground))",
        marginBottom: 44,
        maxWidth: 1000
      }
    }, sub), children);
  }

  /* ---------- Comuns aos fluxos antigos (variações juntadas) ---------- */
  function SectionTitle({
    children,
    action
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        margin: "20px 2px 10px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: "var(--ios-label3)"
      }
    }, children), action && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label3)"
      }
    }, action));
  }
  function Chip({
    children,
    tone,
    color
  }) {
    const on = tone === "primary";
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        background: on ? P : "var(--glass-strong)",
        color: on ? PF : color || "var(--ios-label2)"
      }
    }, children);
  }
  function Ring({
    pct,
    color = P,
    size = 150,
    stroke = 12,
    children
  }) {
    const r = (size - stroke) / 2,
      c = 2 * Math.PI * r;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      style: {
        transform: "rotate(-90deg)"
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: "var(--glass-strong)",
      strokeWidth: stroke
    }), /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: color,
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeDasharray: c * Math.min(pct, 100) / 100 + " " + c
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }
    }, children));
  }
  /* Barra real para fluxos antigos: aceita as chaves antigas (home, workouts…) ou o rótulo */
  const KIT_ABA = {
    home: "Início",
    workouts: "Treinos",
    nutrition: "Nutrição",
    progress: "Progresso",
    health: "Saúde",
    rank: "Ranking",
    profile: null
  };
  function KitTabBar({
    active
  }) {
    const a = active in KIT_ABA ? KIT_ABA[active] : active;
    return /*#__PURE__*/React.createElement(TabBar, {
      active: a || "__"
    });
  }
  /* Barra do Especialista (mantida): Painel, Alunos, Treinos, Nutrição */
  function TabBarEspecialista({
    active = "Painel"
  }) {
    const T = [["layout-dashboard", "Painel"], ["users", "Alunos"], ["dumbbell", "Treinos"], ["apple", "Nutrição"]];
    return /*#__PURE__*/React.createElement("div", {
      className: "tabbar"
    }, T.map(([i, l]) => {
      const on = l === active;
      return /*#__PURE__*/React.createElement("div", {
        key: l,
        className: "tabitem" + (on ? " on" : ""),
        style: {
          color: on ? PT : "var(--ios-label3)",
          fontWeight: on ? 700 : 600
        }
      }, I(i, 23, on ? PT : "var(--ios-label3)"), l);
    }));
  }
  /* Par escuro + claro de qualquer tela */
  function ThemePair({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "kit-pair"
    }, ["", "light"].map(t => /*#__PURE__*/React.createElement("div", {
      key: t,
      className: "th " + t
    }, children, /*#__PURE__*/React.createElement("span", {
      className: "kit-tag"
    }, t ? "Claro" : "Escuro"))));
  }
  function VarianteAluno({
    children = "Variante · Aluno"
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: "kit-variant"
    }, I("user-check", 12, "hsl(var(--primary))"), children);
  }
  Object.assign(window, {
    I,
    P,
    PF,
    PT,
    AMB,
    BLU,
    PNK,
    RED,
    OK,
    tint,
    mono,
    Phone,
    Scroll,
    Row,
    BotaoRedondo,
    StepBar,
    OnbHeader,
    Title,
    Label,
    Vidro,
    CaixaDeIcone,
    GlassChoice,
    ChoiceTile,
    ChipPick,
    ChipMulti,
    Chips,
    GlassSegmented,
    Campo,
    BarraDeProgresso,
    Precisao,
    Nota,
    Anel,
    LinhaDeVidro,
    PassoDeEspera,
    BotaoDeDestaque,
    BotaoSecundario,
    BarraDeDuasAcoes,
    Fade,
    GlassSheet,
    AntesDepois,
    TabBar,
    SectionTitle,
    Chip,
    Ring,
    KitTabBar,
    TabBarEspecialista,
    ThemePair,
    VarianteAluno,
    UDI,
    UDmono,
    UDTabBar,
    UDSheet,
    UDOpt,
    UDToast,
    UDMapa,
    Compare,
    UDPage
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/kit/kit.jsx", error: String((e && e.message) || e) }); }

// mobile/student/01-onboarding/aluno-convite.jsx
try { (() => {
function AlunoSenha() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Criar senha")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 1,
    total: 3
  }), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Convite de Daniel Levi",
    size: 28,
    sub: "Seu especialista te convidou. Crie uma senha para entrar."
  }, "Bem-vinda, Marina"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Campo, {
    label: "E-mail",
    value: "marina@email.com"
  }), /*#__PURE__*/React.createElement(Campo, {
    label: "Senha",
    value: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 10
    },
    icon: "lock"
  }, "M\xEDnimo de 8 caracteres, com um n\xFAmero.")));
}
function AlunoVinculo() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "check"
    }, "Confirmar v\xEDnculo")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 2,
    total: 3
  }), /*#__PURE__*/React.createElement(Title, {
    size: 28,
    sub: "Ele monta seu treino e sua dieta e acompanha sua evolu\xE7\xE3o."
  }, "Este \xE9 o seu especialista"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 22,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 99,
      background: "var(--glass-strong)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 18,
      color: "var(--ios-label)"
    }
  }, "DL"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Daniel Levi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ios-label2)",
      marginTop: 2
    }
  }, "Especialista \xB7 treino e dieta"))), /*#__PURE__*/React.createElement(Label, null, "O que ele v\xEA"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(LinhaDeVidro, {
    first: true,
    icon: "dumbbell",
    title: "Seus treinos e cargas"
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "utensils",
    title: "Suas refei\xE7\xF5es registradas"
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "heart-pulse",
    title: "Dados de sa\xFAde que voc\xEA autorizar"
  }))));
}
function AlunoAnamnese() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BarraDeDuasAcoes, {
      sec: "Depois",
      secIcon: "clock",
      pri: "Pr\xF3xima etapa",
      priIcon: "arrow-right"
    })
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 3,
    total: 3,
    skip: "Responder depois"
  }), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Anamnese \xB7 etapa 1 de 4",
    size: 26,
    sub: "Daniel usa isso para montar seu plano. Nada \xE9 gerado pelo app."
  }, "Sua rotina hoje"), /*#__PURE__*/React.createElement(Label, null, "Treina atualmente?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(ChipPick, {
    w: 1
  }, "N\xE3o"), /*#__PURE__*/React.createElement(ChipPick, {
    w: 1,
    on: true
  }, "1\u20132x"), /*#__PURE__*/React.createElement(ChipPick, {
    w: 1
  }, "3x ou mais")), /*#__PURE__*/React.createElement(Label, null, "Algum destes se aplica?"), /*#__PURE__*/React.createElement(Chips, {
    gap: 8
  }, [["Lesão ou dor", 1], ["Diabetes"], ["Hipertensão"], ["Nenhum"]].map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t)))));
}
Object.assign(window, {
  AlunoSenha,
  AlunoVinculo,
  AlunoAnamnese
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/01-onboarding/aluno-convite.jsx", error: String((e && e.message) || e) }); }

// mobile/student/01-onboarding/onb-screens-a.jsx
try { (() => {
function O1() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 84
    }, "Come\xE7ar"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      text: true,
      bottom: 40
    }, "J\xE1 tenho conta"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 330,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: 40,
      transform: "translateX(-50%)",
      width: 220,
      height: 220,
      borderRadius: 99,
      background: "radial-gradient(50% 50% at 50% 50%,hsl(var(--primary) / .28) 0%,transparent 70%)",
      filter: "blur(18px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "glass",
    style: {
      position: "absolute",
      left: "50%",
      top: 58,
      transform: "translateX(-50%)",
      width: 184,
      height: 184,
      borderRadius: 99,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Anel, {
    pct: 72,
    size: 150,
    stroke: 11,
    value: "2.150",
    unit: "kcal por dia",
    sub: "estimativa"
  })), /*#__PURE__*/React.createElement("div", {
    className: "glass",
    style: {
      position: "absolute",
      left: 6,
      top: 22,
      padding: "9px 12px",
      borderRadius: 16,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, I("dumbbell", 15, PT), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Treino \xB7 4x por semana")), /*#__PURE__*/React.createElement("div", {
    className: "glass",
    style: {
      position: "absolute",
      right: 4,
      top: 262,
      padding: "9px 12px",
      borderRadius: 16,
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, I("utensils", 15, PT), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Dieta \xB7 5 refei\xE7\xF5es"))), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Eleva Pro",
    size: 36,
    sub: "Treino e dieta feitos para voc\xEA, sem precisar conversar com ningu\xE9m."
  }, "Seu plano em 3 minutos")));
}
const OBJ = [["flame", "Perder gordura"], ["dumbbell", "Ganhar massa"], ["heart-pulse", "Saúde e disposição"], ["trophy", "Desempenho no esporte"]];
function O2({
  none
}) {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: none ? /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      disabled: true,
      hint: "Escolha um objetivo para continuar"
    }, "Continuar") : /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Continuar")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 1
  }), /*#__PURE__*/React.createElement(Title, {
    sub: "Escolha o principal. Voc\xEA pode mudar depois."
  }, "Qual \xE9 o seu objetivo?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, OBJ.map(([i, t], k) => /*#__PURE__*/React.createElement(GlassChoice, {
    key: t,
    icon: i,
    title: t,
    active: !none && k === 0
  })))));
}
const O2Vazio = () => /*#__PURE__*/React.createElement(O2, {
  none: true
});
function O3() {
  const L = [["sprout", "Iniciante", "Nunca treinei ou faz tempo"], ["rotate-ccw", "Voltando", "Já treinei, estou recomeçando"], ["activity", "Intermediário", "Treino com frequência"], ["gauge", "Avançado", "Treino há anos e acompanho carga"]];
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Continuar")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 2
  }), /*#__PURE__*/React.createElement(Title, {
    sub: "Isso define o volume e a dificuldade do treino."
  }, "Como voc\xEA se descreveria?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, L.map(([i, t, s], k) => /*#__PURE__*/React.createElement(GlassChoice, {
    key: t,
    icon: i,
    title: t,
    sub: s,
    active: k === 1
  })))));
}
function O4({
  bad
}) {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: bad ? /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      disabled: true,
      hint: "Corrija a altura para continuar"
    }, "Continuar") : /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Continuar")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 3
  }), /*#__PURE__*/React.createElement(Title, {
    sub: "S\xF3 tr\xEAs n\xFAmeros. \xC9 o que usamos para calcular sua meta."
  }, "Sobre voc\xEA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Campo, {
    label: "Idade",
    value: "29",
    unit: "anos"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Campo, {
    label: "Altura",
    value: bad ? "1,72" : "172",
    unit: "cm",
    error: bad && "Use centímetros, de 100 a 250. Ex.: 172"
  }), /*#__PURE__*/React.createElement(Campo, {
    label: "Peso",
    value: bad ? "" : "78",
    placeholder: "\u2014",
    unit: "kg"
  }))), /*#__PURE__*/React.createElement(Label, null, "Sexo biol\xF3gico"), /*#__PURE__*/React.createElement(GlassSegmented, {
    opts: ["Feminino", "Masculino"],
    value: "Feminino"
  }), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 9
    },
    icon: "info"
  }, "Usado s\xF3 para calcular seu gasto de energia."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Precisao, {
    pct: bad ? 40 : 85,
    nivel: bad ? "Baixa" : "Alta"
  }))));
}
const O4Erro = () => /*#__PURE__*/React.createElement(O4, {
  bad: true
});
function O5() {
  const C = [["Diabetes", 1], ["Doença renal"], ["Gestação ou amamentação"], ["Transtorno alimentar (atual ou passado)"], ["Lesão ou dor", 1], ["Nenhum"]];
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 84
    }, "Continuar"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      text: true,
      bottom: 40
    }, "Prefiro n\xE3o informar"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 3
  }), /*#__PURE__*/React.createElement(Title, {
    sub: "Marque quantos quiser."
  }, "Algum destes se aplica a voc\xEA?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Chips, {
    gap: 8
  }, C.map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t)))), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 22,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "shield-check"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      lineHeight: 1.4,
      color: "var(--ios-label2)"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, "Isso nos ajuda a montar um plano seguro."), " Fica s\xF3 entre voc\xEA e o app."))));
}
function O5bSemInfo() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 96,
      icon: "dumbbell"
    }, "Continuar com o treino"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      bottom: 40,
      icon: "rotate-ccw"
    }, "Responder a triagem"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "shield-check",
    tone: AMB,
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Para sua seguran\xE7a",
    size: 26,
    sub: "Sem saber da sua sa\xFAde, n\xE3o montamos dieta por enquanto. Seu treino continua normal."
  }, "Vamos come\xE7ar pelo treino"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 20,
      padding: "4px 14px"
    }
  }, /*#__PURE__*/React.createElement(LinhaDeVidro, {
    first: true,
    icon: "dumbbell",
    title: "Treino feito para voc\xEA",
    sub: "Montamos agora, como os outros",
    right: I("circle-check", 18, PT)
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "utensils",
    tone: AMB,
    title: "Dieta: sem plano por enquanto",
    sub: "Responda a triagem quando quiser para liberar",
    right: I("chevron-right", 18, "var(--ios-label3)")
  }))));
}
function O5b() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 96,
      icon: "search"
    }, "Encontrar um especialista"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      bottom: 40,
      icon: "dumbbell"
    }, "Continuar s\xF3 com o treino"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 3
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 34
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "stethoscope",
    tone: AMB,
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Para sua seguran\xE7a",
    size: 26,
    sub: "Com diabetes, a alimenta\xE7\xE3o pede acompanhamento individual. Por isso o app n\xE3o monta dieta nesse caso. Seu treino continua normal."
  }, "Sua dieta precisa de um especialista"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 20,
      padding: "4px 14px"
    }
  }, /*#__PURE__*/React.createElement(LinhaDeVidro, {
    first: true,
    icon: "dumbbell",
    title: "Treino feito para voc\xEA",
    sub: "Montamos agora, como os outros",
    right: I("circle-check", 18, PT)
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "bandage",
    title: "Les\xE3o ou dor considerada",
    sub: "Evitamos exerc\xEDcios que pesam no local",
    right: I("circle-check", 18, PT)
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "utensils",
    tone: AMB,
    title: "Dieta com um especialista",
    sub: "Voc\xEA conecta o plano dele aqui depois",
    right: I("chevron-right", 18, "var(--ios-label3)")
  }))));
}
function O6() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Fade, null), /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Continuar"))
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 130
  }, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 4,
    skip: true
  }), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    sub: "Conte o tempo que voc\xEA tem de verdade."
  }, "Seu treino"), /*#__PURE__*/React.createElement(Label, null, "Dias por semana"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, [2, 3, 4, 5, 6].map(d => /*#__PURE__*/React.createElement(ChipPick, {
    key: d,
    w: 1,
    on: d === 4
  }, d))), /*#__PURE__*/React.createElement(Label, null, "Tempo por treino"), /*#__PURE__*/React.createElement(GlassSegmented, {
    opts: ["30 min", "45 min", "60 min", "90 min"],
    value: "45 min"
  }), /*#__PURE__*/React.createElement(Label, null, "Onde voc\xEA treina"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ChoiceTile, {
    icon: "building-2",
    title: "Academia"
  }), /*#__PURE__*/React.createElement(ChoiceTile, {
    icon: "house",
    title: "Casa",
    active: true
  }), /*#__PURE__*/React.createElement(ChoiceTile, {
    icon: "trees",
    title: "Ao ar livre"
  })), /*#__PURE__*/React.createElement(Label, {
    right: "desmarque o que n\xE3o tem"
  }, "Equipamento em casa"), /*#__PURE__*/React.createElement(Chips, null, [["Halteres", 1], ["Elástico", 1], ["Barra fixa"], ["Só o corpo", 1]].map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t))), /*#__PURE__*/React.createElement(Label, {
    right: "opcional"
  }, "Pratica algum esporte?"), /*#__PURE__*/React.createElement(Chips, null, [["Corrida", 1], ["Beach tennis"], ["Futebol"], ["Jiu-jitsu"], ["Ciclismo"], ["Nenhum"]].map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t)))));
}
function O7() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Fade, null), /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "sparkles"
    }, "Montar meu plano"))
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 130
  }, /*#__PURE__*/React.createElement(OnbHeader, {
    step: 5,
    skip: true
  }), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    sub: "Comida de verdade, do jeito que voc\xEA j\xE1 come."
  }, "Sua alimenta\xE7\xE3o"), /*#__PURE__*/React.createElement(Label, null, "Refei\xE7\xF5es por dia"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, [3, 4, 5, 6].map(d => /*#__PURE__*/React.createElement(ChipPick, {
    key: d,
    w: 1,
    on: d === 5
  }, d))), /*#__PURE__*/React.createElement(Label, {
    right: "marque quantos quiser"
  }, "N\xE3o como"), /*#__PURE__*/React.createElement(Chips, null, [["Lactose", 1], ["Glúten"], ["Carne vermelha"], ["Peixe"], ["Ovo"]].map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t))), /*#__PURE__*/React.createElement(Label, null, "Estilo"), /*#__PURE__*/React.createElement(GlassSegmented, {
    opts: ["Onívoro", "Vegetariano", "Vegano"],
    value: "On\xEDvoro"
  }), /*#__PURE__*/React.createElement(Label, {
    right: "marque quantos quiser"
  }, "Rotina"), /*#__PURE__*/React.createElement(Chips, null, [["Cozinho", 1], ["Marmita", 1], ["Como fora"]].map(([t, on]) => /*#__PURE__*/React.createElement(ChipMulti, {
    key: t,
    on: !!on
  }, t))), /*#__PURE__*/React.createElement(Label, null, "Or\xE7amento"), /*#__PURE__*/React.createElement(GlassSegmented, {
    opts: ["Econômico", "Médio", "Livre"],
    value: "M\xE9dio"
  })));
}
Object.assign(window, {
  O1,
  O2,
  O2Vazio,
  O3,
  O4,
  O4Erro,
  O5,
  O5b,
  O5bSemInfo,
  O6,
  O7
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/01-onboarding/onb-screens-a.jsx", error: String((e && e.message) || e) }); }

// mobile/student/01-onboarding/onb-screens-b.jsx
try { (() => {
function Curva({
  pct = 100,
  faded
}) {
  return /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 22,
      opacity: faded ? .45 : 1
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: mono
  }, "Proje\xE7\xE3o \xB7 estimativa"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--ios-label2)"
    }
  }, "16 semanas")), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 120",
    width: "100%",
    height: "120",
    style: {
      display: "block",
      marginTop: 10
    }
  }, [30, 60, 90].map(y => /*#__PURE__*/React.createElement("line", {
    key: y,
    x1: "0",
    x2: "320",
    y1: y,
    y2: y,
    stroke: "var(--glass-brd)",
    strokeDasharray: "2 4"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M8 34 C 90 40, 170 64, 312 70 L 312 98 C 170 92, 90 52, 8 34 Z",
    fill: tint(P, 14),
    style: {
      clipPath: `inset(0 ${100 - pct}% 0 0)`
    }
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 34 C 90 44, 170 76, 312 84",
    fill: "none",
    stroke: P,
    strokeWidth: "3",
    strokeLinecap: "round",
    pathLength: "100",
    strokeDasharray: `${pct} 100`
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "34",
    r: "5",
    fill: P
  })), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      fontSize: 11,
      color: "var(--ios-label2)",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, "Hoje"), " \xB7 78 kg"), /*#__PURE__*/React.createElement("span", null, "faixa prov\xE1vel")), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 10
    }
  }, "Estimativa; recalibramos com seus dados em 2 a 4 semanas."));
}
function O8({
  erro
}) {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: erro ? /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "rotate-cw"
    }, "Tentar de novo") : null
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    back: !!erro
  }), erro ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "wifi-off",
    tone: RED,
    size: 52
  })) : null, /*#__PURE__*/React.createElement(Title, {
    size: 28,
    eyebrow: erro ? "Sem conexão" : "Leva uns segundos",
    sub: erro ? "Sua conexão caiu no meio. Suas respostas estão salvas." : "Estamos juntando tudo que você contou."
  }, erro ? "Não conseguimos montar agora" : "Montando seu plano"), /*#__PURE__*/React.createElement(Curva, {
    pct: erro ? 30 : 62,
    faded: erro
  }), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 12,
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: -1
    }
  }, /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "done",
    label: "Calculando sua meta"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: erro ? "error" : "done",
    label: "Escolhendo seus alimentos"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: erro ? "todo" : "active",
    label: "Montando sua semana de treino"
  })))));
}
const O8Erro = () => /*#__PURE__*/React.createElement(O8, {
  erro: true
});
const MAC = [["Proteína", "140 g", BLU, 62], ["Carboidrato", "240 g", P, 78], ["Gordura", "70 g", PNK, 45]];
function PlanoConteudo() {
  const DIA = [["coffee", "Café da manhã", "Tapioca com ovos, mamão", "400"], ["apple", "Lanche da manhã", "Banana com pasta de amendoim", "250"], ["soup", "Almoço", "Arroz, feijão, frango grelhado, salada", "620"], ["cookie", "Lanche da tarde", "Iogurte sem lactose, aveia, morangos", "300"], ["utensils", "Jantar", "Arroz, ovos mexidos, legumes", "580"]];
  const SEM = [["S", "Superiores"], ["T", "Inferiores"], ["Q", null], ["Q", "Corpo todo"], ["S", "Core e mobilidade"], ["S", "Corrida leve"], ["D", null]];
  return /*#__PURE__*/React.createElement(Scroll, {
    pb: 110
  }, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement(Title, {
    size: 28,
    sub: "Revise e aprove. Voc\xEA pode ajustar quando quiser."
  }, "Seu plano est\xE1 pronto"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 16,
      padding: 12,
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Anel, {
    pct: 100,
    size: 96,
    stroke: 9,
    value: "2.150",
    unit: "kcal / dia",
    sub: "estimativa"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 9
    }
  }, MAC.map(([l, v, c, p]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      color: "var(--ios-label2)"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: "var(--ios-label)"
    }
  }, v)), /*#__PURE__*/React.createElement(BarraDeProgresso, {
    pct: p,
    color: c,
    h: 5
  }))))), /*#__PURE__*/React.createElement(Label, {
    right: "4 treinos \xB7 45 min"
  }, "Sua semana de treino"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      display: "flex",
      gap: 5,
      padding: 10
    }
  }, SEM.map(([d, f], i) => {
    const opt = i === 5;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        borderRadius: 12,
        padding: "8px 2px",
        textAlign: "center",
        background: f ? opt ? "transparent" : tint(P, 14) : "transparent",
        border: `1px ${opt ? "dashed" : "solid"} ${f ? "var(--glass-brd)" : "transparent"}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: "var(--ios-label)"
      }
    }, d), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8.5,
        fontWeight: 600,
        lineHeight: 1.2,
        color: f ? "var(--ios-label2)" : "var(--ios-label3)",
        marginTop: 4,
        minHeight: 20
      }
    }, f || "Livre"), opt && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 7.5,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "var(--ios-label2)",
        marginTop: 3
      }
    }, "opcional"));
  })), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 9
    }
  }, "Corrida leve: opcional, vem do esporte que voc\xEA marcou."), /*#__PURE__*/React.createElement(Label, {
    right: "2.150 kcal"
  }, "Um dia de exemplo"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, DIA.map(([i, t, s, k], n) => /*#__PURE__*/React.createElement(LinhaDeVidro, {
    key: t,
    first: n === 0,
    title: t,
    sub: s,
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "var(--ios-label)",
        whiteSpace: "nowrap"
      }
    }, k, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--ios-label3)"
      }
    }, "kcal"))
  }))));
}
function O9() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Fade, null), /*#__PURE__*/React.createElement(BarraDeDuasAcoes, {
      sec: "Ajustar",
      secIcon: "sliders-horizontal",
      pri: "Aprovar plano",
      priIcon: "check"
    }))
  }, /*#__PURE__*/React.createElement(PlanoConteudo, null));
}
function O10() {
  return /*#__PURE__*/React.createElement(Phone, {
    overlay: /*#__PURE__*/React.createElement(GlassSheet, {
      title: "Ajustar plano",
      sub: "Toque para aplicar. D\xE1 para desfazer."
    }, /*#__PURE__*/React.createElement(AntesDepois, {
      first: true,
      icon: "repeat",
      title: "Trocar um alimento",
      antes: "Frango grelhado",
      depois: "Carne mo\xEDda magra",
      delta: "+20 kcal"
    }), /*#__PURE__*/React.createElement(AntesDepois, {
      icon: "piggy-bank",
      title: "Mais barato",
      antes: "Iogurte sem lactose",
      depois: "Leite sem lactose",
      delta: "\u221230 kcal"
    }), /*#__PURE__*/React.createElement(AntesDepois, {
      icon: "zap",
      title: "Mais r\xE1pido",
      antes: "Jantar \xB7 35 min",
      depois: "Omelete \xB7 10 min",
      delta: "\u221240 kcal"
    }), /*#__PURE__*/React.createElement(AntesDepois, {
      icon: "beef",
      title: "Mais prote\xEDna",
      antes: "140 g",
      depois: "160 g por dia",
      delta: "+80 kcal"
    }), /*#__PURE__*/React.createElement(AntesDepois, {
      icon: "calendar-days",
      title: "Mudar dias de treino",
      antes: "4 dias",
      depois: "3 dias \xB7 Seg, Qua, Sex",
      delta: "\u221290 kcal"
    }))
  }, /*#__PURE__*/React.createElement(PlanoConteudo, null));
}
function O11() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 84,
      icon: "link"
    }, "Conectar"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      text: true,
      bottom: 40
    }, "Agora n\xE3o"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    back: false
  }), /*#__PURE__*/React.createElement(Row, {
    style: {
      marginTop: 22,
      gap: 10
    }
  }, [["heart", "Saúde"], ["activity", "Health Connect"]].map(([i, l]) => /*#__PURE__*/React.createElement(Vidro, {
    key: l,
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: i,
    size: 36
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, l)))), /*#__PURE__*/React.createElement(Title, {
    size: 24,
    eyebrow: "Opcional",
    sub: "Com isso, a meta se ajusta aos seus dias mais e menos ativos."
  }, "Quer que o app use seus passos e seu sono para ajustar o plano?"), /*#__PURE__*/React.createElement(Label, null, "O que vamos ler"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(LinhaDeVidro, {
    first: true,
    icon: "footprints",
    title: "Passos",
    sub: "Para ajustar a meta do dia"
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "moon",
    title: "Sono",
    sub: "Para aliviar o treino depois de noites ruins"
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "watch",
    title: "Treinos do rel\xF3gio",
    sub: "Para n\xE3o contar duas vezes"
  })), /*#__PURE__*/React.createElement(Nota, {
    icon: "lock",
    style: {
      marginTop: 14
    }
  }, "S\xF3 lemos esses dados. Nada \xE9 compartilhado, e voc\xEA desliga quando quiser.")));
}
function O12() {
  return /*#__PURE__*/React.createElement(Phone, {
    tabs: true
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 110
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      paddingTop: 14,
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: mono
  }, "Segunda, 5 de outubro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--ios-label)",
      marginTop: 4
    }
  }, "Ol\xE1, Marina")), /*#__PURE__*/React.createElement(BotaoRedondo, {
    icon: "bell"
  })), /*#__PURE__*/React.createElement(Vidro, {
    active: true,
    style: {
      marginTop: 18,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      color: PT
    }
  }, "Agora \xB7 12:30"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--ios-label2)"
    }
  }, "pr\xF3xima a\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--ios-label)",
      marginTop: 8
    }
  }, "Almo\xE7o \xB7 620 kcal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: "var(--ios-label2)",
      marginTop: 4
    }
  }, "Arroz, feij\xE3o, frango grelhado, salada"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 42,
      borderRadius: 13,
      background: P,
      color: PF,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: ".06em",
      textTransform: "uppercase"
    }
  }, I("check", 15, PF), "Comi"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 42,
      borderRadius: 13,
      background: "var(--glass-strong)",
      border: "1px solid var(--glass-brd)",
      color: "var(--ios-label)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: ".06em",
      textTransform: "uppercase"
    }
  }, I("repeat", 15, "var(--ios-label)"), "Trocar"))), /*#__PURE__*/React.createElement(Label, null, "Treino de hoje"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "dumbbell",
    size: 42
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Treino A \xB7 Superiores"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ios-label2)",
      marginTop: 2
    }
  }, "45 min \xB7 6 exerc\xEDcios \xB7 em casa")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 99,
      background: P,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I("play", 16, PF))), /*#__PURE__*/React.createElement(Label, null, "Seu dia"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Anel, {
    pct: 30,
    size: 84,
    stroke: 8,
    value: "650",
    unit: "de 2.150"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, [["Proteína", "42 / 140 g", BLU, 30], ["Água", "0,5 / 2,5 L", P, 20], ["Passos", "—  conecte o relógio", "var(--ios-label3)", 0]].map(([l, v, c, p]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--ios-label2)"
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, v)), /*#__PURE__*/React.createElement(BarraDeProgresso, {
    pct: p,
    color: c,
    h: 5
  }))))), /*#__PURE__*/React.createElement(Row, {
    style: {
      marginTop: 12,
      padding: "11px 14px",
      borderRadius: 16,
      border: "1px dashed var(--glass-brd)"
    }
  }, I("user-round-pen", 17, "var(--ios-label2)"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12.5,
      color: "var(--ios-label2)"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, "Complete seu perfil"), " \xB7 2 itens, 1 min"), I("chevron-right", 16, "var(--ios-label3)"))));
}
function Board() {
  const box = {
    padding: 16,
    borderRadius: 22,
    background: "var(--ios-bg)",
    border: "1px solid var(--glass-brd)",
    position: "relative",
    overflow: "hidden"
  };
  const H = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      margin: "0 0 10px"
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 760,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      color: "var(--ios-label)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "ChipMulti \xB7 m\xFAltipla escolha"), /*#__PURE__*/React.createElement(Chips, {
    gap: 8
  }, /*#__PURE__*/React.createElement(ChipMulti, null, "Desmarcado"), /*#__PURE__*/React.createElement(ChipMulti, {
    on: true
  }, "Marcado")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14
    }
  }), /*#__PURE__*/React.createElement(H, null, "ChipPick \xB7 escolha \xFAnica"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement(ChipPick, {
    w: 1
  }, "3"), /*#__PURE__*/React.createElement(ChipPick, {
    w: 1,
    on: true
  }, "4"), /*#__PURE__*/React.createElement(ChipPick, {
    w: 1
  }, "5"))), /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "ChoiceTile \xB7 GlassChoice compacto"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ChoiceTile, {
    icon: "building-2",
    title: "Academia"
  }), /*#__PURE__*/React.createElement(ChoiceTile, {
    icon: "house",
    title: "Casa",
    active: true
  }))), /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "Campo \xB7 normal e fora da faixa"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Campo, {
    label: "Peso",
    value: "78",
    unit: "kg"
  }), /*#__PURE__*/React.createElement(Campo, {
    label: "Altura",
    value: "1,72",
    unit: "cm",
    error: "Use cent\xEDmetros. Ex.: 172"
  }))), /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "Precis\xE3o do plano"), /*#__PURE__*/React.createElement(Precisao, {
    pct: 40,
    nivel: "Baixa"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement(Precisao, {
    pct: 85,
    nivel: "Alta"
  })), /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "PassoDeEspera \xB7 4 estados"), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "done",
    label: "Feito"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "active",
    label: "Em andamento"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "todo",
    label: "Aguardando"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "error",
    label: "Interrompido"
  })), /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement(H, null, "AntesDepois \xB7 ajuste"), /*#__PURE__*/React.createElement(AntesDepois, {
    first: true,
    icon: "piggy-bank",
    title: "Mais barato",
    antes: "Iogurte grego",
    depois: "Iogurte natural",
    delta: "\u221230 kcal"
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "beef",
    title: "Mais prote\xEDna",
    antes: "140 g",
    depois: "160 g",
    delta: "+80 kcal"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...box,
      height: 180
    }
  }, /*#__PURE__*/React.createElement(H, null, "BotaoDeDestaque \xB7 ativo"), /*#__PURE__*/React.createElement(BotaoDeDestaque, {
    bottom: 16
  }, "Continuar")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...box,
      height: 180
    }
  }, /*#__PURE__*/React.createElement(H, null, "BotaoDeDestaque \xB7 desabilitado"), /*#__PURE__*/React.createElement(BotaoDeDestaque, {
    bottom: 16,
    disabled: true,
    hint: "Escolha uma op\xE7\xE3o para continuar"
  }, "Continuar")));
}
Object.assign(window, {
  O8,
  O8Erro,
  O9,
  O10,
  O11,
  O12,
  Board
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/01-onboarding/onb-screens-b.jsx", error: String((e && e.message) || e) }); }

// mobile/student/propostas/ajuste-do-plano/aj-a.jsx
try { (() => {
function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
/* novo · Tendência de peso: pesagens em pontos, tendência lime, faixa do ritmo, marcos */
function Tendencia({
  data,
  h = 120,
  band,
  ms = [],
  axis,
  xl = [],
  faded,
  pct = 100,
  win = 5
}) {
  const w = 320,
    l = axis ? 34 : 6,
    r = 8,
    t = axis ? 22 : 10,
    b = axis ? 22 : 8,
    n = data.length;
  const bl = band ? data.map((_, i) => band[0] + band[1] * i) : [];
  const all = [...data, ...bl.map(v => v + band?.[2] || 0), ...bl.map(v => v - (band?.[2] || 0))];
  const mn = Math.min(...all) - .15,
    mx = Math.max(...all) + .15;
  const X = i => l + i * (w - l - r) / (n - 1),
    Y = v => t + (mx - v) / (mx - mn) * (h - t - b);
  const tr = data.map((_, i) => {
    const s = data.slice(Math.max(0, i - (win >> 1)), i + (win >> 1) + 1);
    return s.reduce((a, c) => a + c, 0) / s.length;
  });
  const up = bl.map((v, i) => [X(i), Y(v + band[2])]),
    lo = bl.map((v, i) => [X(i), Y(v - band[2])]).reverse();
  const ticks = axis ? [mx - .15, (mx + mn) / 2, mn + .15] : [];
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    width: "100%",
    style: {
      display: "block",
      opacity: faded ? .4 : 1
    }
  }, ticks.map(v => /*#__PURE__*/React.createElement("g", {
    key: v
  }, /*#__PURE__*/React.createElement("line", {
    x1: l,
    x2: w - r,
    y1: Y(v),
    y2: Y(v),
    stroke: "var(--glass-brd)",
    strokeDasharray: "2 4"
  }), /*#__PURE__*/React.createElement("text", {
    x: l - 6,
    y: Y(v) + 3,
    textAnchor: "end",
    fontSize: "9",
    fontFamily: "var(--font-mono)",
    fill: "var(--ios-label3)"
  }, v.toFixed(1).replace(".", ",")))), band && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: `M${up.map(p => p.join(" ")).join(" L")} L${lo.map(p => p.join(" ")).join(" L")} Z`,
    fill: tint(P, 12)
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${up.map(p => p.join(" ")).join(" L")}`,
    fill: "none",
    stroke: tint(P, 45),
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${lo.reverse().map(p => p.join(" ")).join(" L")}`,
    fill: "none",
    stroke: tint(P, 45),
    strokeDasharray: "3 3"
  })), ms.map(m => /*#__PURE__*/React.createElement("g", {
    key: m.i
  }, /*#__PURE__*/React.createElement("line", {
    x1: X(m.i),
    x2: X(m.i),
    y1: t - 8,
    y2: h - b,
    stroke: "var(--ios-label3)",
    strokeDasharray: "2 3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: X(m.i),
    cy: h - b,
    r: "4",
    fill: "var(--ios-bg)",
    stroke: P,
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("text", {
    x: X(m.i) + 5,
    y: t - 10,
    fontSize: "9.5",
    fontWeight: "700",
    fill: "var(--ios-label2)"
  }, m.label))), data.map((v, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: X(i),
    cy: Y(v),
    r: n > 30 ? 2 : 2.8,
    fill: "var(--ios-label3)"
  })), /*#__PURE__*/React.createElement("path", {
    d: smooth(tr.map((v, i) => [X(i), Y(v)])),
    fill: "none",
    stroke: P,
    strokeWidth: "2.6",
    strokeLinecap: "round",
    pathLength: "100",
    strokeDasharray: `${pct} 100`
  }), pct === 100 && /*#__PURE__*/React.createElement("circle", {
    cx: X(n - 1),
    cy: Y(tr[n - 1]),
    r: "4.5",
    fill: P
  }), xl.map(x => /*#__PURE__*/React.createElement("text", {
    key: x.i,
    x: X(x.i),
    y: h - 6,
    textAnchor: x.i === 0 ? "start" : x.i === n - 1 ? "end" : "middle",
    fontSize: "9",
    fontFamily: "var(--font-mono)",
    fill: "var(--ios-label3)"
  }, x.label)));
}
function Legenda({
  band = true
}) {
  const it = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10.5,
    color: "var(--ios-label2)"
  };
  return /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 14,
      marginTop: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: it
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: "var(--ios-label3)"
    }
  }), "Pesagem"), /*#__PURE__*/React.createElement("span", {
    style: it
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 3,
      borderRadius: 99,
      background: P
    }
  }), "Tend\xEAncia"), band && /*#__PURE__*/React.createElement("span", {
    style: it
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 8,
      borderRadius: 3,
      background: tint(P, 12),
      border: `1px dashed ${tint(P, 45)}`
    }
  }), "Ritmo escolhido"));
}
const W2 = [78.4, 78.1, 78.3, 77.9, 78.0, 78.2, 77.8, 77.9, 77.7, 78.0, 77.8, 77.6, 77.9, 77.7];
/* novo · Chip de motivo da carga sugerida */
function ChipDeMotivo({
  icon,
  delta,
  txt
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "5px 11px 5px 5px",
      borderRadius: 99,
      background: "var(--glass-strong)",
      border: "1px solid var(--glass-brd)",
      fontSize: 11.5,
      color: "var(--ios-label2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 99,
      background: tint(P, 18),
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I(icon, 12, PT)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, delta), " \xB7 ", txt));
}
function Exercicio({
  nome,
  series,
  carga,
  motivo,
  active
}) {
  return /*#__PURE__*/React.createElement(Vidro, {
    active: active,
    style: {
      marginBottom: 9,
      padding: 13
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, nome), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      color: "var(--ios-label2)"
    }
  }, series)), /*#__PURE__*/React.createElement(Row, {
    style: {
      marginTop: 10,
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 12px",
      borderRadius: 12,
      background: "var(--field)",
      border: "1px solid var(--field-brd)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 8.5
    }
  }, "Carga sugerida"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 800,
      color: "var(--ios-label)"
    }
  }, carga)), /*#__PURE__*/React.createElement(ChipDeMotivo, motivo)));
}
function SessaoHeader({
  sub
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement(Title, {
    size: 24,
    sub: sub
  }, "Treino A \xB7 Superiores"));
}
function A1() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "play"
    }, "Come\xE7ar s\xE9rie 1")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(SessaoHeader, {
    sub: "6 exerc\xEDcios \xB7 45 min \xB7 em casa"
  }), /*#__PURE__*/React.createElement(Label, null, "Cargas de hoje"), /*#__PURE__*/React.createElement(Exercicio, {
    active: true,
    nome: "Supino com halteres",
    series: "3 \xD7 10\u201312",
    carga: "12,5 kg",
    motivo: {
      icon: "arrow-up",
      delta: "+2,5 kg",
      txt: "você fez 12 nas 3 séries"
    }
  }), /*#__PURE__*/React.createElement(Exercicio, {
    nome: "Remada curvada",
    series: "3 \xD7 10\u201312",
    carga: "10 kg",
    motivo: {
      icon: "equal",
      delta: "Mantém",
      txt: "tente mais repetições"
    }
  }), /*#__PURE__*/React.createElement(Exercicio, {
    nome: "Desenvolvimento",
    series: "3 \xD7 8\u201310",
    carga: "7,5 kg",
    motivo: {
      icon: "arrow-down",
      delta: "−5%",
      txt: "duas falhas seguidas"
    }
  }), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 6
    },
    icon: "info"
  }, "A carga sugerida se ajusta sozinha. Toque nela para trocar quando quiser.")));
}
function A2() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 110,
        zIndex: 6,
        padding: 14,
        background: "var(--sheet)"
      }
    }, /*#__PURE__*/React.createElement(Row, {
      style: {
        justifyContent: "space-between",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, "Como foi?"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ios-label2)"
      }
    }, "Pular")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(ChipPick, {
      w: 1
    }, "F\xE1cil"), /*#__PURE__*/React.createElement(ChipPick, {
      w: 1,
      on: true
    }, "Ok"), /*#__PURE__*/React.createElement(ChipPick, {
      w: 1
    }, "Dif\xEDcil")), /*#__PURE__*/React.createElement(Nota, {
      style: {
        marginTop: 9
      }
    }, "Ajuda a sugerir a carga da pr\xF3xima vez.")), /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Pr\xF3ximo exerc\xEDcio"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(SessaoHeader, {
    sub: "Exerc\xEDcio 1 de 6 \xB7 conclu\xEDdo"
  }), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 18,
      padding: "4px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 700,
      color: "var(--ios-label)",
      padding: "10px 0 4px"
    }
  }, "Supino com halteres"), [1, 2, 3].map(s => /*#__PURE__*/React.createElement(LinhaDeVidro, {
    key: s,
    title: `Série ${s}`,
    sub: "12 repeti\xE7\xF5es \xB7 12,5 kg",
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ios-label2)"
      }
    }, I("circle-check", 17, PT), "Feita")
  })))));
}
function A3() {
  const N = [["Supino com halteres", "+2,5 kg", "arrow-up"], ["Remada curvada", "Mantém", "equal"], ["Desenvolvimento", "+1 repetição", "plus"], ["Agachamento goblet", "+2,5 kg", "arrow-up"], ["Prancha", "+10 s", "plus"]];
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "check"
    }, "Concluir")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    back: false
  }), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Treino conclu\xEDdo",
    size: 28,
    sub: "Treino A \xB7 Superiores"
  }, "Bom treino, Marina"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 18
    }
  }, [["Tempo", "43 min"], ["Volume", "2.840 kg"]].map(([l, v]) => /*#__PURE__*/React.createElement(Vidro, {
    key: l,
    style: {
      flex: 1,
      padding: "11px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 9
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 800,
      color: "var(--ios-label)",
      marginTop: 3
    }
  }, v))), /*#__PURE__*/React.createElement(Vidro, {
    active: true,
    style: {
      flex: 1.2,
      padding: "11px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 9,
      color: PT,
      display: "flex",
      gap: 4,
      alignItems: "center"
    }
  }, I("trophy", 11, PT), "Recorde"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--ios-label)",
      marginTop: 4,
      lineHeight: 1.3
    }
  }, "Supino 12,5 kg \xD7 12"))), /*#__PURE__*/React.createElement(Label, {
    right: "j\xE1 salvo no plano"
  }, "Na pr\xF3xima vez"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, N.map(([e, d, i], k) => /*#__PURE__*/React.createElement(LinhaDeVidro, {
    key: e,
    first: k === 0,
    title: e,
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 9px",
        borderRadius: 99,
        background: "var(--glass-strong)",
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, I(i, 12, PT), d)
  })))));
}
function A4({
  diaria,
  erro
}) {
  const Q = ["Registrei tudo", "Registrei parte", "Não registrei, mas segui o plano", "Não segui"];
  const D = [["Seg", "77,9"], ["Ter", "77,7"], ["Qua", "78,0"], ["Qui", "77,8"], ["Sex", "77,6"], ["Sáb", "—"], ["Dom", "77,7"]];
  return /*#__PURE__*/React.createElement(Phone, {
    footer: erro ? /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      disabled: true,
      hint: "Corrija o peso para continuar"
    }, "Ver meu ajuste") : /*#__PURE__*/React.createElement(BotaoDeDestaque, null, "Ver meu ajuste")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    skip: "Agora n\xE3o"
  }), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Segunda, 12 de outubro",
    size: 28,
    sub: "1 minuto para ajustar seu plano."
  }, "Sua semana"), /*#__PURE__*/React.createElement(Label, null, "Como foi o registro?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, Q.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: q,
    style: {
      display: "flex"
    }
  }, /*#__PURE__*/React.createElement(ChipPick, {
    w: 1,
    on: i === 0
  }, q)))), diaria ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Label, {
    right: "m\xE9dia da semana"
  }, "Suas pesagens"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, D.map(([d, v]) => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      flex: 1,
      textAlign: "center",
      padding: "6px 0",
      borderRadius: 10,
      background: v === "—" ? "transparent" : "var(--glass-strong)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 8.5
    }
  }, d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: v === "—" ? "var(--ios-label3)" : "var(--ios-label)",
      marginTop: 3
    }
  }, v)))), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 10,
      padding: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--ios-label2)"
    }
  }, "M\xE9dia \xB7 6 pesagens"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 800,
      color: "var(--ios-label)"
    }
  }, "77,8 kg")))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Campo, {
    label: "Seu peso hoje",
    value: erro ? "778" : "77,6",
    unit: "kg",
    error: erro && "Use quilos, de 30 a 300, com vírgula. Ex.: 77,6"
  })), !erro && /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 9
    }
  }, "De manh\xE3, em jejum, depois do banheiro. Uma vez por semana basta."))));
}
const A4Diaria = () => /*#__PURE__*/React.createElement(A4, {
    diaria: true
  }),
  A4Erro = () => /*#__PURE__*/React.createElement(A4, {
    erro: true
  });
function Status({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 11px",
      borderRadius: 99,
      background: "var(--glass-strong)",
      border: "1px solid var(--glass-brd)",
      fontSize: 11.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, I(icon, 13, PT), children);
}
const A5V = {
  base: {
    st: ["trending-down", "Abaixo do ritmo"],
    motivo: "Você cumpriu 6 de 7 dias e perdeu 0,3 kg, abaixo do ritmo que escolheu.",
    rows: [["target", "Meta diária", "2.150 kcal", "2.000 kcal · menos arroz no jantar", "−150 kcal"]],
    acao: "dois"
  },
  a: {
    st: ["circle-check", "No ritmo"],
    motivo: "Tudo no ritmo, seguimos igual. Você perdeu 0,5 kg, dentro da faixa que escolheu.",
    rows: [["target", "Meta diária", "2.150 kcal", "2.150 kcal · sem mudança", "0 kcal"]],
    acao: "Seguir igual",
    data: [78.4, 78.1, 78.3, 77.9, 78.0, 78.2, 77.8, 77.8, 77.5, 77.7, 77.4, 77.3, 77.6, 77.4]
  },
  b: {
    st: ["circle-dashed", "Dados insuficientes"],
    motivo: "Com registro parcial mantemos a meta. Registre mais esta semana.",
    rows: [],
    acao: "Entendi",
    data: [78.4, null, null, 78.0, null, null, null, 77.9, null, null, null, null, 77.8, null],
    tip: true
  },
  c: {
    st: ["list-checks", "Plano mais simples"],
    motivo: "Você seguiu 2 de 7 dias. Em vez de cortar calorias, vamos deixar o plano mais fácil de seguir.",
    rows: [["utensils", "Refeições por dia", "5", "4 · mesma meta", "0 kcal"], ["timer", "Tempo das receitas", "até 35 min", "até 15 min", "0 kcal"]],
    acao: "dois"
  },
  d: {
    st: ["trending-down", "Mais rápido que o ritmo"],
    motivo: "Você perdeu 1,2 kg, mais rápido que o ritmo que escolheu. Vamos subir um pouco a meta.",
    rows: [["target", "Meta diária", "2.150 kcal", "2.300 kcal · um lanche maior", "+150 kcal"]],
    acao: "dois",
    data: [78.4, 78.1, 78.0, 77.7, 77.6, 77.4, 77.3, 77.2, 77.0, 76.9, 77.0, 76.8, 76.9, 76.8]
  }
};
function A5({
  v = "base"
}) {
  const c = A5V[v],
    data = c.data || W2;
  const pts = data.filter(x => x != null);
  const foot = c.acao === "dois" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Fade, null), /*#__PURE__*/React.createElement(BarraDeDuasAcoes, {
    sec: "Manter mais uma semana",
    secIcon: "pause",
    pri: "Aprovar",
    priIcon: "check"
  })) : /*#__PURE__*/React.createElement(BotaoDeDestaque, {
    icon: "check"
  }, c.acao);
  return /*#__PURE__*/React.createElement(Phone, {
    footer: foot
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    eyebrow: "Ajuste da semana"
  }, "Seu plano para esta semana"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 16,
      padding: "12px 12px 10px"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Status, {
    icon: c.st[0]
  }, c.st[1]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--ios-label2)"
    }
  }, "2 semanas")), /*#__PURE__*/React.createElement(Tendencia, {
    data: pts,
    h: 110,
    band: c.data && v === "b" ? null : [78.2, -0.075, 0.18],
    win: v === "b" ? 1 : 5
  }), /*#__PURE__*/React.createElement(Legenda, {
    band: v !== "b"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.45,
      color: "var(--ios-label)",
      marginTop: 14,
      textWrap: "pretty"
    }
  }, c.motivo), c.rows.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Label, {
    right: c.rows.length > 1 ? "o cardápio é refeito" : "o Assistente refaz o cardápio"
  }, "Proposta"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, c.rows.map((r, i) => /*#__PURE__*/React.createElement(AntesDepois, {
    key: r[1],
    first: i === 0,
    icon: r[0],
    title: r[1],
    antes: r[2],
    depois: r[3],
    delta: r[4]
  })))), c.tip && /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 16,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "bell"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12.5,
      color: "var(--ios-label2)"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, "Lembrete \xE0s 20h"), " \xB7 para registrar o dia"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 9,
      color: "var(--ios-label2)"
    }
  }, "Ligar"))));
}
function A5Aluno() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "check"
    }, "Entendi")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    eyebrow: "Check-in enviado"
  }, "Seu especialista vai revisar sua semana"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 16,
      padding: "12px 12px 10px"
    }
  }, /*#__PURE__*/React.createElement(Tendencia, {
    data: W2,
    h: 110,
    band: [78.2, -0.075, 0.18]
  }), /*#__PURE__*/React.createElement(Legenda, null)), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 99,
      background: "var(--glass-strong)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      color: "var(--ios-label)"
    }
  }, "DL"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 1.4,
      color: "var(--ios-label2)"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--ios-label)"
    }
  }, "Daniel Levi recebe seu check-in"), " e decide se o plano muda. Voc\xEA ser\xE1 avisada quando ele atualizar.")), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 12
    }
  }, "Nada muda no seu plano at\xE9 o especialista revisar.")));
}
const A5a = () => /*#__PURE__*/React.createElement(A5, {
    v: "a"
  }),
  A5b = () => /*#__PURE__*/React.createElement(A5, {
    v: "b"
  }),
  A5c = () => /*#__PURE__*/React.createElement(A5, {
    v: "c"
  }),
  A5d = () => /*#__PURE__*/React.createElement(A5, {
    v: "d"
  });
function A5Estado({
  erro
}) {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: erro ? /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "rotate-cw"
    }, "Tentar de novo") : null
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), erro && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "wifi-off",
    tone: RED,
    size: 52
  })), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    eyebrow: erro ? "Sem conexão" : "Leva uns segundos",
    sub: erro ? "Suas respostas estão salvas." : "Comparando sua semana com o ritmo que você escolheu."
  }, erro ? "Não conseguimos calcular agora" : "Calculando seu ajuste"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 18,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(Tendencia, {
    data: W2,
    h: 110,
    band: [78.2, -0.075, 0.18],
    pct: erro ? 35 : 60,
    faded: erro
  })), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 12,
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: -1
    }
  }, /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "done",
    label: "Lendo seus registros"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: erro ? "error" : "active",
    label: "Calculando sua tend\xEAncia"
  }), /*#__PURE__*/React.createElement(PassoDeEspera, {
    state: "todo",
    label: "Revendo sua meta"
  })))));
}
const A5Calc = () => /*#__PURE__*/React.createElement(A5Estado, null),
  A5Erro = () => /*#__PURE__*/React.createElement(A5Estado, {
    erro: true
  });
Object.assign(window, {
  A5Aluno,
  Tendencia,
  Legenda,
  Status,
  ChipDeMotivo,
  A1,
  A2,
  A3,
  A4,
  A4Diaria,
  A4Erro,
  A5,
  A5a,
  A5b,
  A5c,
  A5d,
  A5Calc,
  A5Erro
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/propostas/ajuste-do-plano/aj-a.jsx", error: String((e && e.message) || e) }); }

// mobile/student/propostas/ajuste-do-plano/aj-b.jsx
try { (() => {
function HojeTopo() {
  return /*#__PURE__*/React.createElement(Row, {
    style: {
      paddingTop: 14,
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: mono
  }, "Segunda, 12 de outubro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--ios-label)",
      marginTop: 4
    }
  }, "Ol\xE1, Marina")), /*#__PURE__*/React.createElement(BotaoRedondo, {
    icon: "bell"
  }));
}
const btn = pri => ({
  flex: 1,
  height: 42,
  borderRadius: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontSize: 11.5,
  fontWeight: 800,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  background: pri ? P : "var(--glass-strong)",
  color: pri ? PF : "var(--ios-label)",
  border: pri ? "none" : "1px solid var(--glass-brd)"
});
function A6({
  modo = "proposta"
}) {
  const card = {
    pendente: /*#__PURE__*/React.createElement(Vidro, {
      active: true,
      style: {
        marginTop: 18,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(Row, {
      style: {
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        color: PT
      }
    }, "Pr\xF3xima a\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--ios-label2)"
      }
    }, "1 min")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: "-.03em",
        color: "var(--ios-label)",
        marginTop: 8
      }
    }, "Fa\xE7a o check-in da semana"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label2)",
        marginTop: 4
      }
    }, "Duas perguntas para ajustar seu plano."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: btn(1)
    }, I("clipboard-check", 15, PF), "Come\xE7ar"))),
    proposta: /*#__PURE__*/React.createElement(Vidro, {
      active: true,
      style: {
        marginTop: 18,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(Row, {
      style: {
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        color: PT
      }
    }, "Ajuste da semana"), /*#__PURE__*/React.createElement(Status, {
      icon: "trending-down"
    }, "Abaixo do ritmo")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 800,
        letterSpacing: "-.03em",
        color: "var(--ios-label)",
        marginTop: 10
      }
    }, "Meta proposta: 2.000 kcal"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label2)",
        marginTop: 4
      }
    }, "Voc\xEA perdeu 0,3 kg, abaixo do ritmo escolhido."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: btn(1)
    }, I("arrow-right", 15, PF), "Ver ajuste"))),
    aprovado: /*#__PURE__*/React.createElement(Vidro, {
      style: {
        marginTop: 18,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
      icon: "circle-check",
      size: 38
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, "Plano atualizado \xB7 2.000 kcal"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--ios-label2)",
        marginTop: 2
      }
    }, "Card\xE1pio refeito para a nova meta")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ios-label2)"
      }
    }, "Desfazer"))
  }[modo];
  return /*#__PURE__*/React.createElement(Phone, {
    tabs: true
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 110
  }, /*#__PURE__*/React.createElement(HojeTopo, null), card, /*#__PURE__*/React.createElement(Label, null, modo === "aprovado" ? "Agora · 12:30" : "Depois"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Almo\xE7o \xB7 ", modo === "aprovado" ? "580" : "620", " kcal"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--ios-label2)"
    }
  }, "12:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ios-label2)",
      marginTop: 3
    }
  }, "Arroz, feij\xE3o, frango grelhado, salada"), modo === "aprovado" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 9,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: btn(1)
  }, I("check", 15, PF), "Comi"), /*#__PURE__*/React.createElement("div", {
    style: btn(0)
  }, I("repeat", 15, "var(--ios-label)"), "Trocar"))), /*#__PURE__*/React.createElement(Label, null, "Treino de hoje"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "dumbbell",
    size: 42
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 700,
      color: "var(--ios-label)"
    }
  }, "Treino A \xB7 Superiores"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--ios-label2)",
      marginTop: 2
    }
  }, "45 min \xB7 6 exerc\xEDcios \xB7 em casa")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 99,
      background: P,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, I("play", 16, PF)))));
}
const A6Pend = () => /*#__PURE__*/React.createElement(A6, {
    modo: "pendente"
  }),
  A6Ok = () => /*#__PURE__*/React.createElement(A6, {
    modo: "aprovado"
  });
function A7Descarga() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "check"
    }, "Entendi")
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "battery-charging",
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Fim do bloco 1",
    size: 28,
    sub: "Metade do volume para o corpo recuperar. J\xE1 estava no seu plano: a cada 4 semanas."
  }, "Semana 4: descarga"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 20,
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(AntesDepois, {
    first: true,
    icon: "layers",
    title: "S\xE9ries por exerc\xEDcio",
    antes: "3",
    depois: "2 \xB7 mesma carga",
    delta: "\u221250% vol."
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "timer",
    title: "Tempo por treino",
    antes: "45 min",
    depois: "30 min",
    delta: "\u221215 min"
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "target",
    title: "Meta di\xE1ria",
    antes: "2.000 kcal",
    depois: "2.000 kcal",
    delta: "0 kcal"
  })), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 12
    }
  }, "Na semana 5 tudo volta ao normal, com as cargas da semana 3.")));
}
function NivelMuda() {
  return /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 18,
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(AntesDepois, {
    first: true,
    icon: "calendar-days",
    title: "Dias por semana",
    antes: "4",
    depois: "5",
    delta: "+1 dia"
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "layout-grid",
    title: "Divis\xE3o",
    antes: "Corpo todo",
    depois: "Por grupo muscular",
    delta: "nova"
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "timer",
    title: "Tempo por treino",
    antes: "45 min",
    depois: "45 min",
    delta: "igual"
  }));
}
function A7Nivel() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BarraDeDuasAcoes, {
      sec: "Continuar como estou",
      secIcon: "x",
      pri: "Aprovar",
      priIcon: "check"
    })
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "chevrons-up",
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Fim do bloco 2 \xB7 semana 8",
    size: 26,
    sub: "8 semanas com 80% dos treinos feitos."
  }, "Quer passar para intermedi\xE1rio?"), /*#__PURE__*/React.createElement(NivelMuda, null), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 12
    }
  }, "Se n\xE3o gostar, voc\xEA volta para iniciante pelo perfil.")));
}
function A7Aviso() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 84,
      icon: "check"
    }, "Ver nova semana"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      text: true,
      bottom: 40
    }, "Voltar para iniciante"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "chevrons-up",
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Fim do bloco 2 \xB7 semana 8",
    size: 26,
    sub: "8 semanas com 80% dos treinos feitos. Seu plano j\xE1 foi atualizado."
  }, "Voc\xEA passou para intermedi\xE1rio"), /*#__PURE__*/React.createElement(NivelMuda, null)));
}
function A8() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Fade, null), /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      icon: "pause"
    }, "Pausar plano"))
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 130
  }, /*#__PURE__*/React.createElement(OnbHeader, null), /*#__PURE__*/React.createElement(Title, {
    size: 26,
    sub: "Metas e sequ\xEAncia ficam pausadas. Nada se perde."
  }, "Modo Descanso"), /*#__PURE__*/React.createElement(Label, null, "Motivo"), /*#__PURE__*/React.createElement(GlassChoice, {
    icon: "thermometer",
    title: "Estou doente",
    active: true
  }), /*#__PURE__*/React.createElement(GlassChoice, {
    icon: "bandage",
    title: "Estou machucada"
  }), /*#__PURE__*/React.createElement(GlassChoice, {
    icon: "plane",
    title: "Viagem ou rotina corrida"
  }), /*#__PURE__*/React.createElement(Label, null, "At\xE9 quando"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7
    }
  }, ["3 dias", "1 semana", "2 semanas", "Não sei"].map((d, i) => /*#__PURE__*/React.createElement(ChipPick, {
    key: d,
    w: 1,
    on: i === 1
  }, d))), /*#__PURE__*/React.createElement(Label, null, "Fica pausado"), /*#__PURE__*/React.createElement(Chips, null, ["Meta de calorias", "Sequência", "Check-in da semana"].map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 32,
      padding: "0 12px",
      borderRadius: 99,
      background: "var(--glass-strong)",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--ios-label)"
    }
  }, I("pause", 12, "var(--ios-label2)"), t)))));
}
function A8Volta() {
  const S = [["S", "Corpo todo", 1], ["T", null], ["Q", "Mobilidade", 1], ["Q", null], ["S", "Corpo todo", 1], ["S", null], ["D", null]];
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(BarraDeDuasAcoes, {
      sec: "Ajustar",
      secIcon: "sliders-horizontal",
      pri: "Come\xE7ar a semana",
      priIcon: "check"
    })
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    back: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(CaixaDeIcone, {
    icon: "sunrise",
    size: 60
  })), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Fim do Modo Descanso",
    size: 28,
    sub: "Esta semana come\xE7a mais leve."
  }, "Bem-vinda de volta"), /*#__PURE__*/React.createElement(Label, {
    right: "semana de retorno"
  }, "Seus treinos"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      display: "flex",
      gap: 5,
      padding: 10
    }
  }, S.map(([d, f], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      borderRadius: 12,
      padding: "8px 2px",
      textAlign: "center",
      background: f ? tint(P, 14) : "transparent",
      border: `1px solid ${f ? "var(--glass-brd)" : "transparent"}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 800,
      color: "var(--ios-label)"
    }
  }, d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8.5,
      fontWeight: 600,
      lineHeight: 1.2,
      color: f ? "var(--ios-label2)" : "var(--ios-label3)",
      marginTop: 4,
      minHeight: 20
    }
  }, f || "Livre")))), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 12,
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(AntesDepois, {
    first: true,
    icon: "calendar-days",
    title: "Treinos nesta semana",
    antes: "4",
    depois: "3",
    delta: "\u22121"
  }), /*#__PURE__*/React.createElement(AntesDepois, {
    icon: "dumbbell",
    title: "Carga",
    antes: "como antes",
    depois: "\u221220% para reacostumar",
    delta: "\u221220%"
  }))));
}
const W9 = Array.from({
  length: 22
}, (_, i) => +(78 - i * 0.29 + 0.22 * Math.sin(i * 1.9)).toFixed(1));
W9[21] = 72.0;
function A9() {
  return /*#__PURE__*/React.createElement(Phone, {
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BotaoDeDestaque, {
      bottom: 96,
      icon: "check"
    }, "Passar para manuten\xE7\xE3o"), /*#__PURE__*/React.createElement(BotaoSecundario, {
      bottom: 40,
      icon: "target"
    }, "Definir nova meta"))
  }, /*#__PURE__*/React.createElement(Scroll, null, /*#__PURE__*/React.createElement(OnbHeader, {
    back: false
  }), /*#__PURE__*/React.createElement(Title, {
    eyebrow: "Meta atingida",
    size: 30,
    sub: "Foram 16 semanas. Agora d\xE1 para comer mais e manter."
  }, "Voc\xEA chegou a 72 kg."), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      marginTop: 16,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(Tendencia, {
    data: W9,
    h: 100,
    win: 5,
    xl: [{
      i: 0,
      label: "Jun"
    }, {
      i: 21,
      label: "Out"
    }]
  })), /*#__PURE__*/React.createElement(Label, null, "Proposta"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(AntesDepois, {
    first: true,
    icon: "target",
    title: "Meta di\xE1ria",
    antes: "2.000 kcal",
    depois: "2.350 kcal \xB7 manuten\xE7\xE3o",
    delta: "+350 kcal"
  })), /*#__PURE__*/React.createElement(Nota, {
    style: {
      marginTop: 10
    }
  }, "Estimativa; recalibramos com seus dados em 2 a 4 semanas.")));
}
const W10 = Array.from({
  length: 42
}, (_, i) => +(78.4 - i * 0.06 + 0.25 * Math.sin(i * 1.7) + 0.15 * Math.cos(i * 0.9)).toFixed(1));
function A10() {
  return /*#__PURE__*/React.createElement(Phone, {
    tabs: "Progresso"
  }, /*#__PURE__*/React.createElement(Scroll, {
    pb: 110
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      paddingTop: 14,
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(BotaoRedondo, null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--ios-label)"
    }
  }, "Tend\xEAncia de peso")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(GlassSegmented, {
    opts: ["4 semanas", "3 meses", "Tudo"],
    value: "3 meses"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "14px 10px 12px",
      borderRadius: 22,
      background: "hsl(var(--surface))",
      border: "1px solid var(--glass-brd)"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      padding: "0 6px",
      alignItems: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 9
    }
  }, "Tend\xEAncia hoje"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: "-.03em",
      color: "var(--ios-label)"
    }
  }, "75,9 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--ios-label2)"
    }
  }, "kg"))), /*#__PURE__*/React.createElement(Status, {
    icon: "circle-check"
  }, "No ritmo")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Tendencia, {
    data: W10,
    h: 250,
    axis: true,
    band: [78.3, -0.058, 0.35],
    ms: [{
      i: 10,
      label: "2.000 kcal"
    }, {
      i: 28,
      label: "Intermediário"
    }],
    xl: [{
      i: 0,
      label: "Sem 1"
    }, {
      i: 20,
      label: "Sem 6"
    }, {
      i: 41,
      label: "Sem 12"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 6px"
    }
  }, /*#__PURE__*/React.createElement(Legenda, null))), /*#__PURE__*/React.createElement(Label, null, "Ajustes aprovados"), /*#__PURE__*/React.createElement(Vidro, {
    style: {
      padding: "2px 14px"
    }
  }, /*#__PURE__*/React.createElement(LinhaDeVidro, {
    first: true,
    icon: "target",
    title: "Meta 2.150 \u2192 2.000 kcal",
    sub: "Semana 3 \xB7 abaixo do ritmo"
  }), /*#__PURE__*/React.createElement(LinhaDeVidro, {
    icon: "chevrons-up",
    title: "Passou para intermedi\xE1rio",
    sub: "Semana 8 \xB7 80% dos treinos"
  }))));
}
Object.assign(window, {
  A6,
  A6Pend,
  A6Ok,
  A7Descarga,
  A7Nivel,
  A7Aviso,
  A8,
  A8Volta,
  A9,
  A10
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/propostas/ajuste-do-plano/aj-b.jsx", error: String((e && e.message) || e) }); }

// mobile/student/propostas/uso-diario/pecas.jsx
try { (() => {
(() => {
  const L = "hsl(var(--primary))",
    LT = "hsl(var(--primary-text))",
    LF = "hsl(var(--primary-foreground))";
  const ic = (n, s, c) => UDI(n, s, c);
  const pill = pri => ({
    flex: 1,
    height: 40,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 11.5,
    fontWeight: 800,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    background: pri ? L : "var(--glass-strong)",
    color: pri ? LF : "var(--ios-label)",
    border: pri ? "none" : "1px solid var(--glass-brd)"
  });
  /* Aviso de Prontidão baixa: cartão (Início) ou faixa (Pré-início) */
  function ProntidaoAviso({
    faixa
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        padding: faixa ? 12 : 14,
        marginBottom: 10,
        borderColor: "color-mix(in srgb, " + AMB + " 45%, transparent)",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "color-mix(in srgb, " + AMB + " 18%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, ic("battery-low", 16, AMB)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, "Prontid\xE3o baixa (54) \xB7 sono 5h10"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--ios-label2)",
        marginTop: 2
      }
    }, "Vers\xE3o leve: 30 min, carga \u221220%"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: pill(1)
    }, ic("feather", 14, LF), "Fazer vers\xE3o leve"), /*#__PURE__*/React.createElement("div", {
      style: pill(0)
    }, "Manter o treino")));
  }
  /* Folha da sequência semanal */
  function SequenciaSheet() {
    const W = [["S30", 1, "4 treinos"], ["S31", 1, "3 treinos"], ["S32", 0, "2 treinos · 3 dias"], ["S33", 1, "5 dias de registro"], ["S34", 1, "3 treinos"], ["S35", 1, "4 treinos"], ["S36", 1, "3 treinos"], ["S37", 2, "2 de 3 treinos"]];
    return /*#__PURE__*/React.createElement(UDSheet, {
      title: "4 semanas seguidas",
      sub: "Sua sequ\xEAncia conta semanas ativas, n\xE3o dias."
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(8,1fr)",
        gap: 6
      }
    }, W.map(([w, s, t], i) => /*#__PURE__*/React.createElement("div", {
      key: w,
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "100%",
        aspectRatio: "1",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: s === 1 ? L : s === 2 ? "color-mix(in srgb, " + L + " 18%, transparent)" : "var(--glass-strong)",
        border: s === 2 ? "1.5px dashed " + L : "1px solid var(--glass-brd)"
      }
    }, s === 1 ? ic("check", 15, LF) : s === 2 ? ic("loader", 14, LT) : ic("minus", 14, "var(--ios-label3)")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        fontWeight: 700,
        color: "var(--ios-label3)"
      }
    }, w)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 14,
        marginTop: 10,
        fontSize: 10.5,
        color: "var(--ios-label2)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 5,
        alignItems: "center"
      }
    }, ic("check", 12, LT), "Ativa"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 5,
        alignItems: "center"
      }
    }, ic("minus", 12, "var(--ios-label3)"), "N\xE3o contou"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        gap: 5,
        alignItems: "center"
      }
    }, ic("loader", 12, LT), "Em andamento")), /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        padding: 12,
        marginTop: 14,
        fontSize: 12.5,
        lineHeight: 1.45,
        color: "var(--ios-label2)"
      }
    }, "Uma semana conta com ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--ios-label)"
      }
    }, "3 treinos"), " ou ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: "var(--ios-label)"
      }
    }, "5 dias de registro"), ". Registrar um dia esquecido recupera a semana."), /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        padding: "11px 12px",
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, ic("calendar-plus", 16, LT), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: "var(--ios-label)"
      }
    }, /*#__PURE__*/React.createElement("b", null, "S32"), " \xB7 falta 1 treino ou 2 dias de registro"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: LT
      }
    }, "Registrar")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--ios-label2)",
        marginTop: 12
      }
    }, "Esta semana: 2 de 3 treinos. Falta 1."));
  }
  /* Selo de recorde na série */
  function RecordeSelo({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        marginTop: 10,
        padding: "9px 12px",
        display: "flex",
        alignItems: "center",
        gap: 9,
        borderColor: L,
        background: "color-mix(in srgb, " + L + " 12%, var(--glass))",
        boxShadow: "0 0 24px -6px " + L + ", inset 0 1px 0 var(--spec)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 99,
        background: L,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, ic("trophy", 14, LF)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "var(--ios-label)"
      }
    }, children), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: LT
      }
    }, "Novo recorde"));
  }
  /* Notificação do descanso na tela bloqueada */
  function TelaBloqueada() {
    return /*#__PURE__*/React.createElement("div", {
      className: "phone",
      style: {
        background: "var(--ios-bg)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "glow"
    }), /*#__PURE__*/React.createElement("div", {
      className: "island"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 78
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--ios-label2)"
      }
    }, ic("lock", 13, "var(--ios-label2)"), "Ter\xE7a, 12 de agosto"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 84,
        fontWeight: 800,
        letterSpacing: "-.04em",
        color: "var(--ios-label)",
        lineHeight: 1,
        marginTop: 4
      }
    }, "9:41"), /*#__PURE__*/React.createElement("div", {
      className: "glass",
      style: {
        width: "calc(100% - 28px)",
        marginTop: "auto",
        marginBottom: 120,
        padding: 14,
        borderRadius: 24,
        background: "var(--sheet)",
        boxSizing: "border-box"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        background: L,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, ic("dumbbell", 12, LF)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--ios-label2)"
      }
    }, "Eleva Pro"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontSize: 11.5,
        color: "var(--ios-label3)"
      }
    }, "agora")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--ios-label)"
      }
    }, "Descanso \xB7 Remada curvada"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: "var(--ios-label2)",
        marginTop: 3
      }
    }, "Pr\xF3xima: s\xE9rie 3 \xB7 10 \xD7 45 kg")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 34,
        fontWeight: 800,
        letterSpacing: "-.03em",
        color: LT,
        lineHeight: 1
      }
    }, "0:45")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        borderRadius: 99,
        background: "var(--glass-strong)",
        marginTop: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "50%",
        height: "100%",
        background: L
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: pill(0)
    }, ic("plus", 14, "var(--ios-label)"), "15 s"), /*#__PURE__*/React.createElement("div", {
      style: pill(1)
    }, ic("skip-forward", 14, LF), "Pular")))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 44,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        padding: "0 48px"
      }
    }, ["flashlight", "camera"].map(n => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        width: 48,
        height: 48,
        borderRadius: 99,
        background: "var(--glass-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, ic(n, 20, "var(--ios-label)")))), /*#__PURE__*/React.createElement("div", {
      className: "homebar"
    }));
  }
  /* Folha Trocar exercício */
  function TrocarSheet() {
    const ALT = [["Remada com halteres", "Halteres · mesmo músculo"], ["Remada com elástico", "Elástico · mais leve nas costas"], ["Remada unilateral apoiada", "Halter + banco ou cadeira"]];
    return /*#__PURE__*/React.createElement(UDSheet, {
      title: "Trocar exerc\xEDcio",
      sub: "Remada curvada \xB7 4 \xD7 8\u201310"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 7
      }
    }, [["calendar", "Trocar só hoje", 1], ["repeat", "Trocar sempre"], ["thumbs-down", "Recomendar menos"]].map(([i, t, on]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        flex: 1,
        padding: "10px 6px",
        borderRadius: 14,
        textAlign: "center",
        background: on ? "color-mix(in srgb, " + L + " 16%, transparent)" : "var(--glass-strong)",
        border: on ? "1.5px solid " + L : "1px solid var(--glass-brd)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center"
      }
    }, ic(on ? "circle-check" : i, 17, on ? LT : "var(--ios-label2)")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--ios-label)",
        marginTop: 6,
        lineHeight: 1.25
      }
    }, t)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        margin: "16px 2px 6px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: "var(--ios-label3)"
      }
    }, "Alternativas"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: "var(--ios-label2)"
      }
    }, "em casa: halteres e el\xE1stico")), ALT.map(([t, s], i) => /*#__PURE__*/React.createElement(UDOpt, {
      key: t,
      first: i === 0,
      icon: "dumbbell",
      title: t,
      sub: s
    })));
  }
  Object.assign(window, {
    ProntidaoAviso,
    SequenciaSheet,
    RecordeSelo,
    TelaBloqueada,
    TrocarSheet
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "mobile/student/propostas/uso-diario/pecas.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.ProgressCard = __ds_scope.ProgressCard;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SidebarNavItem = __ds_scope.SidebarNavItem;

})();
