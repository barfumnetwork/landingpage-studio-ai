import { useState } from 'react';
import { de } from '../../../i18n/de';
import { ConfirmDialog } from '../../../app/shell/ConfirmDialog';
import { useProjectStore } from '../../../store/projectStore';
import type { Service } from '../../../types/project';
import { Field } from '../Field';
import styles from '../fields.module.css';
import { hasServiceContent, nextEntityId } from '../wizardConfig';

function emptyService(id: string): Service {
  return { id, name: '', description: '', price: '', imageId: null };
}

export function ServicesStep() {
  const services = useProjectStore((state) => state.project?.services ?? []);
  const updateProject = useProjectStore((state) => state.updateProject);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const items = services.length > 0 ? services : [emptyService('SVC_01')];

  function change(id: string, patch: Partial<Service>) {
    const exists = services.some((item) => item.id === id);
    const base = exists ? services : items;
    updateProject({
      services: base.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function add() {
    const id = nextEntityId(
      'SVC',
      services.map((item) => item.id),
    );
    updateProject({ services: [...services, emptyService(id)] });
  }

  function remove(id: string) {
    updateProject({ services: services.filter((item) => item.id !== id) });
    setPendingId(null);
  }

  function requestRemove(item: Service) {
    if (hasServiceContent(item.name, item.description, item.price)) {
      setPendingId(item.id);
      return;
    }
    remove(item.id);
  }

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>{de.wizard.steps.services.emptyHint}</p>
      {items.map((item, index) => (
        <article key={item.id} className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>
              {de.wizard.review.serviceCount} {String(index + 1).padStart(2, '0')}
            </p>
            {items.length > 1 ||
            hasServiceContent(item.name, item.description, item.price) ? (
              <button
                type="button"
                className="btn btn-tertiary"
                onClick={() => requestRemove(item)}
              >
                {de.wizard.remove}
              </button>
            ) : null}
          </div>
          <Field label={de.wizard.steps.services.name} htmlFor={`${item.id}-name`}>
            <input
              id={`${item.id}-name`}
              className={styles.input}
              data-wizard-primary={index === 0 ? true : undefined}
              value={item.name}
              onChange={(event) => change(item.id, { name: event.target.value })}
            />
          </Field>
          <Field
            label={de.wizard.steps.services.description}
            htmlFor={`${item.id}-copy`}
            optional
          >
            <textarea
              id={`${item.id}-copy`}
              className={styles.textarea}
              value={item.description}
              onChange={(event) => change(item.id, { description: event.target.value })}
            />
          </Field>
          <Field
            label={de.wizard.steps.services.price}
            htmlFor={`${item.id}-price`}
            optional
          >
            <input
              id={`${item.id}-price`}
              className={styles.input}
              value={item.price}
              onChange={(event) => change(item.id, { price: event.target.value })}
            />
          </Field>
        </article>
      ))}
      <button type="button" className="btn btn-secondary" onClick={add}>
        {de.wizard.steps.services.add}
      </button>
      <ConfirmDialog
        open={pendingId !== null}
        title={de.wizard.deleteService.title}
        body={de.wizard.deleteService.body}
        cancelLabel={de.confirm.cancel}
        confirmLabel={de.wizard.deleteService.confirm}
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId) remove(pendingId);
        }}
      />
    </div>
  );
}
