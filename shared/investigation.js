// Fictional, offline incident. Reserved .test domains never require live access.
/** @type {Record<string, [string, string]>} */
export const investigationCopy = {};
const text = (ru, en, az) => {
  investigationCopy[ru] = [en, az];
  return ru;
};
export const investigation = {
  id: "mail-trail",
  title: text("Дело: поддельный счёт", "Case: the forged invoice", "İş: saxta hesab faktura"),
  category: "Forensics", difficulty: "Medium", minutes: 40,
  rating: "—", cover: "network",
  description: text(
    "Учебное расследование: свяжите письмо, вход в аккаунт и сетевой след. Все данные вымышлены; открывать ссылки не нужно.",
    "Training investigation: connect an email, an account login and network evidence. All data is fictional; do not open any links.",
    "Təlim araşdırması: məktubu, hesaba girişi və şəbəkə izini əlaqələndirin. Bütün məlumatlar uydurmadır; keçidləri açmaq lazım deyil."),
  lessons: [
    {
      title: text("Письмо с приманкой", "The lure email", "Aldadıcı məktub"),
      body: text("Сотрудник получил счёт от имени поставщика lime-vendor.test. Прочитайте письмо и укажите домен ссылки, куда его просят войти. Ответ: FLAG{домен}.", "An employee received an invoice claiming to be from lime-vendor.test. Read the email and identify the domain of the login link. Answer: FLAG{domain}.", "Əməkdaş lime-vendor.test təchizatçısının adından hesab faktura alıb. Məktubu oxuyun və giriş keçidinin domenini tapın. Cavab: FLAG{domen}."),
      file: "invoice.eml", command: "cat",
      artifact: "From: Billing <billing@lime-vendor.test>\nReply-To: invoice@vendor-pay.test\nTo: a.aliyeva@lime-office.test\nDate: 2026-11-18T09:12:00Z\nSubject: Invoice 7318\nLogin-URL: https://vendor-pay.test/invoice/7318",
      value: "vendor-pay.test",
      hints: [
        text("Сравните адрес отправителя с адресом страницы входа.", "Compare the sender address with the login page address.", "Göndərənin ünvanını giriş səhifəsinin ünvanı ilə müqayisə edin."),
        text("В поле Login-URL домен находится между https:// и следующим /.", "In Login-URL, the domain is between https:// and the next /.", "Login-URL sahəsində domen https:// ilə növbəti / arasındadır."),
        text("Нужен vendor-pay.test, без протокола и пути.", "Use vendor-pay.test, without the protocol or path.", "Protokol və yol olmadan vendor-pay.test yazın."),
      ],
      explanation: text("Ссылка ведёт на vendor-pay.test, а не на домен поставщика. Это повод проверить письмо независимым каналом, но само несовпадение ещё не доказывает атаку. Не вводите пароль по ссылке из письма; откройте известный адрес поставщика самостоятельно.", "The link points to vendor-pay.test instead of the supplier domain. This warrants independent verification, but a mismatch alone does not prove an attack. Avoid entering a password through an email link; open the known supplier address yourself.", "Keçid təchizatçının domeninə deyil, vendor-pay.test ünvanına aparır. Bu, ayrıca kanalla yoxlama üçün səbəbdir, lakin təkcə uyğunsuzluq hücumu sübut etmir. Məktubdakı keçidlə parol daxil etməyin; təchizatçının məlum ünvanını özünüz açın."),
    },
    {
      title: text("Необычный вход", "An unusual login", "Qeyri adi giriş"),
      body: text("После письма появился вход без MFA. Найдите успешный вход в аккаунт получателя письма и укажите его src. Сопоставьте имя с invoice.eml.", "After the email, a login without MFA appeared. Find the successful login for the email recipient and submit its src. Match the account with invoice.eml.", "Məktubdan sonra MFA olmadan giriş qeydə alınıb. Məktubu alan şəxsin hesabına uğurlu girişi tapın və src dəyərini göndərin. Adı invoice.eml ilə tutuşdurun."),
      file: "auth.log", command: "cat",
      artifact: "2026-11-18T09:05:00Z user=a.aliyeva src=192.0.2.18 result=success mfa=passed\n2026-11-18T09:16:00Z user=backup.bot src=192.0.2.40 result=success mfa=service\n2026-11-18T09:18:00Z user=a.aliyeva src=203.0.113.47 result=failed mfa=none\n2026-11-18T09:19:00Z user=a.aliyeva src=203.0.113.47 result=success mfa=none",
      value: "203.0.113.47",
      hints: [
        text("Нужен получатель письма, а не служебный аккаунт.", "Follow the email recipient, not the service account.", "Xidmət hesabını deyil, məktubu alan şəxsi izləyin."),
        text("Найдите user=a.aliyeva с result=success и mfa=none.", "Find user=a.aliyeva with result=success and mfa=none.", "result=success və mfa=none olan user=a.aliyeva qeydini tapın."),
        text("В строке 09:19 значение src равно 203.0.113.47.", "At 09:19 the src value is 203.0.113.47.", "09:19 sətrində src dəyəri 203.0.113.47 olur."),
      ],
      explanation: text("В 09:19 аккаунт получателя использован с 203.0.113.47 без MFA, после неудачной попытки. Это усиливает подозрение, но журнал не доказывает, что пароль украден именно письмом. Проверьте вход с владельцем, отзовите подозрительные сессии и включите MFA.", "At 09:19 the recipient account was used from 203.0.113.47 without MFA after a failed attempt. This adds suspicion, but the log does not prove the email stole the password. Verify with the owner, revoke suspicious sessions and enable MFA.", "09:19 zamanı alıcının hesabına uğursuz cəhddən sonra 203.0.113.47 ünvanından MFA olmadan daxil olunub. Bu, şübhəni artırır, lakin parolun məhz məktubla oğurlandığını sübut etmir. Sahiblə yoxlayın, şübhəli sessiyaları ləğv edin və MFA aktivləşdirin."),
    },
    {
      title: text("След в прокси", "The proxy trail", "Proksi izi"),
      body: text("Найдите запрос получателя на домен из письма и отправьте идентификатор его рабочей станции: FLAG{имя узла}.", "Find the recipient's request to the domain from the email and submit the workstation identifier: FLAG{hostname}.", "Alıcının məktubdakı domenə sorğusunu tapın və iş stansiyasının identifikatorunu göndərin: FLAG{qovşaq adı}."),
      file: "proxy.log", command: "cat",
      artifact: "2026-11-18T09:11:00Z host=ws-12 user=r.hasanov domain=lime-vendor.test path=/catalog action=allow\n2026-11-18T09:14:00Z host=ws-17 user=a.aliyeva domain=vendor-pay.test path=/invoice/7318 action=allow\n2026-11-18T09:15:00Z host=ws-17 user=a.aliyeva domain=vendor-pay.test path=/login method=POST action=allow\n2026-11-18T09:17:00Z host=ws-22 user=s.mammadov domain=docs.test path=/help action=allow",
      value: "ws-17",
      hints: [
        text("Сопоставьте домен из первого этапа и пользователя из второго.", "Match the domain from stage one with the user from stage two.", "Birinci mərhələdəki domeni ikinci mərhələdəki istifadəçi ilə tutuşdurun."),
        text("Нужны строки user=a.aliyeva domain=vendor-pay.test; прочитайте host.", "Look for user=a.aliyeva domain=vendor-pay.test and read host.", "user=a.aliyeva domain=vendor-pay.test sətirlərində host sahəsini oxuyun."),
        text("Оба запроса отправлены с ws-17.", "Both requests came from ws-17.", "Hər iki sorğu ws-17 stansiyasından göndərilib."),
      ],
      explanation: text("ws-17 открыла ссылку в 09:14 и отправила POST на /login в 09:15. Прокси подтверждает обращение, но не содержимое отправленных данных. Сохраните журналы и проверьте станцию; одного посещения недостаточно, чтобы утверждать заражение.", "ws-17 opened the link at 09:14 and sent a POST to /login at 09:15. The proxy confirms contact, not the submitted contents. Preserve logs and inspect the workstation; a visit alone does not establish malware infection.", "ws-17 keçidi 09:14 zamanı açıb və 09:15 zamanı /login yoluna POST göndərib. Proksi əlaqəni təsdiqləyir, göndərilən məzmunu deyil. Jurnalları qoruyun və stansiyanı yoxlayın; təkcə ziyarət yoluxmanı sübut etmir."),
    },
    {
      title: text("Вывод по инциденту", "Incident assessment", "İnsident üzrə nəticə"),
      body: text("Сопоставьте все три журнала. В файле assessment.txt выберите код наиболее обоснованного вывода и отправьте FLAG{код}.", "Correlate all three records. In assessment.txt choose the code for the best supported conclusion and submit FLAG{code}.", "Hər üç qeydi tutuşdurun. assessment.txt faylında ən əsaslı nəticənin kodunu seçin və FLAG{kod} göndərin."),
      file: "assessment.txt", command: "cat",
      artifact: text("A: Подтверждено заражение всех станций.\nB: Вероятен фишинг с последующим подозрительным входом; требуется проверка владельцем.\nC: Письмо безопасно, потому что в From указан знакомый домен.", "A: Malware infection of every workstation is confirmed.\nB: Likely phishing followed by a suspicious login; owner verification is required.\nC: The email is safe because From contains a familiar domain.", "A: Bütün stansiyaların zərərli proqramla yoluxması təsdiqlənib.\nB: Ehtimal olunan fişinqdən sonra şübhəli giriş baş verib; hesab sahibi ilə yoxlama lazımdır.\nC: From sahəsində tanış domen olduğu üçün məktub təhlükəsizdir."),
      value: "B",
      hints: [
        text("Отделите наблюдаемые события от предположений.", "Separate observed events from assumptions.", "Müşahidə olunan hadisələri fərziyyələrdən ayırın."),
        text("Есть переход, POST и необычный вход, но нет доказательства заражения.", "There is a visit, a POST and an unusual login, but no proof of malware.", "Ziyarət, POST və qeyri adi giriş var, lakin yoluxma sübutu yoxdur."),
        text("Выберите B. Формат ответа: FLAG{B}.", "Choose B. Answer format: FLAG{B}.", "B seçin. Cavab formatı: FLAG{B}."),
      ],
      explanation: text("Вывод B соответствует свидетельствам: письмо в 09:12, переход в 09:14, POST в 09:15 и вход в 09:19. Сохраните письмо и журналы, свяжитесь с владельцем, отзовите сессии, смените пароль и включите MFA. Блокируйте подозрительный домен после проверки. Утечка данных и заражение этими материалами не подтверждены.", "Conclusion B fits the evidence: email at 09:12, visit at 09:14, POST at 09:15 and login at 09:19. Preserve the email and logs, contact the owner, revoke sessions, reset the password and enable MFA. Block the suspicious domain after validation. These records do not establish data theft or malware infection.", "B nəticəsi sübutlara uyğundur: 09:12 məktub, 09:14 ziyarət, 09:15 POST və 09:19 giriş. Məktubu və jurnalları qoruyun, sahiblə əlaqə saxlayın, sessiyaları ləğv edin, parolu dəyişin və MFA aktivləşdirin. Yoxlamadan sonra şübhəli domeni bloklayın. Bu materiallar məlumat oğurluğunu və yoluxmanı təsdiqləmir."),
    },
  ],
};
text("Следующая подсказка", "Next hint", "Növbəti ipucu");
text("Разбор решения", "Solution review", "Həllin izahı");
text("Следующий этап", "Next stage", "Növbəti mərhələ");
text("Расследование завершено", "Investigation complete", "Araşdırma tamamlandı");
