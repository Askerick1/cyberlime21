import { tr, locale } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { Github, LogIn, ShieldCheck, X } from "lucide-react";
import { api } from "./data";
type GIS = {
  initialize: (v: {
    client_id: string;
    nonce: string;
    callback: (v: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GIS } };
  }
}
let loading: Promise<void> | undefined;
function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client?hl=" + locale();
      s.async = true;
      const timer = setTimeout(() => s.onerror?.(new Event("error")), 15000);
      s.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      s.onerror = () => {
        clearTimeout(timer);
        loading = undefined;
        s.remove();
        reject(
          Error("Не удалось загрузить окно Google. Проверьте соединение."),
        );
      };
      document.head.appendChild(s);
    });
  return loading;
}
export function Auth({
  close,
  done,
}: {
  close: () => void;
  done: () => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const [msg, set] = useState("Загрузка Google…"),
    [attempt, retry] = useState(0),
    [retryable, allowRetry] = useState(false);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubError, setGithubError] = useState("");
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const { clientId, github } = await api("auth/config");
        if (!active) return;
        setGithubEnabled(github === true);
        if (!clientId) {
          if (active)
            set(
              "Вход через Google пока недоступен.",
            );
          return;
        }
        const [{ nonce }] = await Promise.all([
          api("auth/challenge", {}),
          loadGoogle(),
        ]);
        if (!active || !ref.current) return;
        const g = window.google!.accounts.id;
        g.initialize({
          client_id: clientId,
          nonce,
          callback: async ({ credential }) => {
            if (!active) return;
            try {
              set("Подтверждаем вход…");
              await api("auth/google", { credential });
              if (active) await done();
            } catch (e) {
              if (active) {
                set((e as Error).message);
                allowRetry(true);
              }
            }
          },
        });
        g.renderButton(ref.current, {
          width: Math.min(400, ref.current.clientWidth),
          shape: "pill",
          logo_alignment: "left",
          theme: document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          locale: locale(),
        });
        set("");
      } catch (e) {
        if (active) {
          set((e as Error).message);
          allowRetry(true);
        }
      }
    }
    start();
    return () => {
      active = false;
      ref.current?.replaceChildren();
    };
  }, [attempt]);
  async function startGithub() {
    setGithubBusy(true);
    setGithubError("");
    try {
      const { authorize } = await api("auth/github/start", {});
      sessionStorage.setItem("cyberlime.githubReturn", location.hash);
      location.assign(authorize);
    } catch (error) {
      setGithubError((error as Error).message);
      setGithubBusy(false);
    }
  }
  return (
    <dialog ref={dialog} onCancel={close} className="authDialog signupDialog" aria-labelledby="signup-title">
      <button
        className="iconBtn close"
        onClick={close}
        aria-label={tr("Закрыть")}
      >
        <X />
      </button>
      <span className="tile green">
        <ShieldCheck />
      </span>
      <h2 id="signup-title">{tr("Начните обучение в CyberLime")}</h2>
      <p>{tr("Первый модуль доступен гостям. Войдите, чтобы открыть остальные задания и сохранять XP в аккаунте.")}</p>
      <div className="signupProviders">
        <div ref={ref} className="googleSignIn" />
        <button type="button" className="secondary githubSignIn" disabled={!githubEnabled || githubBusy} onClick={() => void startGithub()}>
          <Github size={18} />{tr(githubBusy ? "Открываем GitHub…" : "Продолжить с GitHub")}
        </button>
        {!githubEnabled && <small>{tr("Вход через GitHub пока недоступен.")}</small>}
      </div>
      {githubError && <p className="notice" role="alert">{tr(githubError)}</p>}
      {msg && (
        <p role="status" className="notice">
          {tr(msg)}
        </p>
      )}
      {retryable && (
        <button
          className="primary"
          onClick={() => {
            allowRetry(false);
            retry((v) => v + 1);
          }}
        >
          <LogIn size={16} />
          {tr("Повторить вход")}
        </button>
      )}
      <button className="textBtn" onClick={close}>
        {tr("Продолжить без аккаунта")}
      </button>
    </dialog>
  );
}
