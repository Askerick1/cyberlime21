import { ArrowRight, FlaskConical, Lightbulb, Route, Terminal } from "lucide-react";
import { courseIds } from "../shared/academy.js";
import { tr } from "./i18n";
import "./welcome.css";

const benefits = [
  { icon: FlaskConical, title: "Практика с первой комнаты", text: "Читайте журналы событий, проверяйте права доступа и находите улики в учебных системах.", link: "Каталог комнат", href: "#rooms" },
  { icon: Route, title: "Понятный порядок обучения", text: "Восемь модулей ведут от основ защиты к реагированию на инциденты. Каждый этап опирается на предыдущий.", link: "Последовательный курс", href: "#course" },
  { icon: Lightbulb, title: "Обратная связь после попытки", text: "Ошиблись? Получите совет, проверьте свою версию ещё раз и сравните её с разбором решения.", link: "Попробовать первый модуль", href: "#lab/" + courseIds[0] },
];

export function Welcome({ signIn }: { signIn: () => void }) {
  return <div className="welcome">
    <header className="welcomeNav">
      <a className="brand" href="#welcome"><span className="brandIcon"><Terminal size={22}/></span>CyberLime<i /></a>
      <nav aria-label={tr("Разделы сайта")}>
        <a href="#dashboard">{tr("Главная")}</a>
        <button className="secondary" onClick={signIn}>{tr("Войти")}</button>
      </nav>
    </header>
    <main id="main" tabIndex={-1} className="welcomeMain">
      <section className="welcomeHero">
        <div className="welcomeLead">
          <h1>{tr("Кибербезопасность на практике")}</h1>
          <p>{tr("Откройте учебную лабораторию и попробуйте себя в роли аналитика. Первый модуль можно пройти без аккаунта.")}</p>
          <a className="primary" href={"#lab/" + courseIds[0]}>{tr("Попробовать первый модуль")}<ArrowRight size={18}/></a>
        </div>
      </section>
      <section className="welcomeBenefits" aria-label={tr("Как устроено обучение")}>
        <h2>{tr("Как устроено обучение")}</h2>
        <div>{benefits.map(({icon: Icon, title, text, href, link}) => <article key={href}>
          <Icon size={23} aria-hidden="true"/><h3>{tr(title)}</h3><p>{tr(text)}</p>
          <a href={href}>{tr(link)} <ArrowRight size={15}/></a>
        </article>)}</div>
      </section>
    </main>
  </div>;
}
