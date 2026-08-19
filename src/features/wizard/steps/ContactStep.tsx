import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import { Field } from '../Field';
import styles from '../fields.module.css';
import { isValidEmail, isValidUrl } from '../wizardConfig';

export function ContactStep() {
  const contact = useProjectStore((state) => state.project?.contact);
  const updateProject = useProjectStore((state) => state.updateProject);

  if (!contact) return null;

  const emailError =
    contact.email.length > 0 && !isValidEmail(contact.email)
      ? de.wizard.errors.email
      : undefined;
  const websiteError =
    contact.website.length > 0 && !isValidUrl(contact.website)
      ? de.wizard.errors.url
      : undefined;

  return (
    <div className={styles.stack}>
      <Field
        label={de.wizard.contact.email}
        htmlFor="contact-email"
        optional
        error={emailError}
      >
        <input
          id="contact-email"
          className={styles.input}
          data-wizard-primary
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(event) => updateProject({ contact: { email: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.contact.phone} htmlFor="contact-phone" optional>
        <input
          id="contact-phone"
          className={styles.input}
          type="tel"
          autoComplete="tel"
          value={contact.phone}
          onChange={(event) => updateProject({ contact: { phone: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.contact.whatsapp} htmlFor="contact-wa" optional>
        <input
          id="contact-wa"
          className={styles.input}
          value={contact.whatsapp}
          onChange={(event) =>
            updateProject({ contact: { whatsapp: event.target.value } })
          }
        />
      </Field>
      <Field label={de.wizard.contact.address} htmlFor="contact-address" optional>
        <input
          id="contact-address"
          className={styles.input}
          autoComplete="street-address"
          value={contact.address}
          onChange={(event) =>
            updateProject({ contact: { address: event.target.value } })
          }
        />
      </Field>
      <Field label={de.wizard.contact.city} htmlFor="contact-city" optional>
        <input
          id="contact-city"
          className={styles.input}
          autoComplete="address-level2"
          value={contact.city}
          onChange={(event) => updateProject({ contact: { city: event.target.value } })}
        />
      </Field>
      <Field label={de.wizard.contact.country} htmlFor="contact-country" optional>
        <input
          id="contact-country"
          className={styles.input}
          autoComplete="country-name"
          value={contact.country}
          onChange={(event) =>
            updateProject({ contact: { country: event.target.value } })
          }
        />
      </Field>
      <Field
        label={de.wizard.contact.website}
        htmlFor="contact-web"
        optional
        error={websiteError}
      >
        <input
          id="contact-web"
          className={styles.input}
          inputMode="url"
          autoComplete="url"
          value={contact.website}
          onChange={(event) =>
            updateProject({ contact: { website: event.target.value } })
          }
        />
      </Field>
      <Field label={de.wizard.contact.hours} htmlFor="contact-hours" optional>
        <textarea
          id="contact-hours"
          className={styles.textarea}
          value={contact.hours}
          onChange={(event) => updateProject({ contact: { hours: event.target.value } })}
        />
      </Field>
    </div>
  );
}
