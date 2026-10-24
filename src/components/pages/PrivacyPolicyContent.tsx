import { privacyPolicyDe } from "@/src/locales/privacyPolicy.de";
import { focusRingClasses } from "@/src/styles/focusRing";

export default function PrivacyPolicyContent() {
  return (
    <article lang="de" className="mt-6 space-y-8 text-sm leading-relaxed">
      <p className="text-gray-600 dark:text-gray-400">
        {privacyPolicyDe.updated}
      </p>
      <aside
        aria-labelledby="privacy-draft-heading"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <h2 id="privacy-draft-heading" className="font-semibold">
          {privacyPolicyDe.draftTitle}
        </h2>
        <p className="mt-2">{privacyPolicyDe.draftDescription}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {privacyPolicyDe.openPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </aside>
      {privacyPolicyDe.sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`privacy-${section.id}`}
          className="space-y-3"
        >
          <h2 id={`privacy-${section.id}`} className="text-lg font-semibold">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="whitespace-pre-line wrap-break-word">
              {paragraph}
            </p>
          ))}
          {"items" in section && section.items && (
            <ul className="list-disc space-y-2 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {"links" in section && section.links && (
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`wrap-break-word rounded-sm text-blue-600 underline dark:text-blue-400 ${focusRingClasses}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
