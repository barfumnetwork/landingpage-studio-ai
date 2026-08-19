import { useState } from 'react';
import { ConfirmDialog } from '../../../app/shell/ConfirmDialog';
import { de } from '../../../i18n/de';
import { useProjectStore } from '../../../store/projectStore';
import type { Person } from '../../../types/project';
import { Field } from '../Field';
import styles from '../fields.module.css';
import { hasPersonContent, nextEntityId } from '../wizardConfig';

function blankPerson(id: string): Person {
  return { id, name: '', role: '', description: '', story: '', imageId: null };
}

export function TeamStep() {
  const person = useProjectStore((state) => state.project?.person ?? null);
  const team = useProjectStore((state) => state.project?.team ?? []);
  const updateProject = useProjectStore((state) => state.updateProject);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const lead = person ?? blankPerson('PER_01');

  function saveLead(patch: Partial<Person>) {
    const next = { ...lead, ...patch };
    if (!hasPersonContent(next.name, next.role, next.description, next.story)) {
      updateProject({ person: null });
      return;
    }
    updateProject({ person: next });
  }

  function saveMember(id: string, patch: Partial<Person>) {
    updateProject({
      team: team.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addMember() {
    const id = nextEntityId(
      'TEAM',
      team.map((item) => item.id),
    );
    updateProject({ team: [...team, blankPerson(id)] });
  }

  function removeMember(id: string) {
    updateProject({ team: team.filter((item) => item.id !== id) });
    setPendingId(null);
  }

  function requestRemove(item: Person) {
    if (hasPersonContent(item.name, item.role, item.description, item.story)) {
      setPendingId(item.id);
      return;
    }
    removeMember(item.id);
  }

  return (
    <div className={styles.stack}>
      <p className={styles.hint}>{de.wizard.steps.team.helper}</p>
      <article className={styles.card}>
        <p className={styles.cardTitle}>01</p>
        <Field label={de.wizard.steps.team.name} htmlFor="lead-name" optional>
          <input
            id="lead-name"
            className={styles.input}
            data-wizard-primary
            value={lead.name}
            onChange={(event) => saveLead({ name: event.target.value })}
          />
        </Field>
        <Field label={de.wizard.steps.team.role} htmlFor="lead-role" optional>
          <input
            id="lead-role"
            className={styles.input}
            value={lead.role}
            onChange={(event) => saveLead({ role: event.target.value })}
          />
        </Field>
        <Field label={de.wizard.steps.team.description} htmlFor="lead-copy" optional>
          <textarea
            id="lead-copy"
            className={styles.textarea}
            value={lead.description}
            onChange={(event) => saveLead({ description: event.target.value })}
          />
        </Field>
        <Field label={de.wizard.steps.team.story} htmlFor="lead-story" optional>
          <textarea
            id="lead-story"
            className={styles.textarea}
            value={lead.story}
            onChange={(event) => saveLead({ story: event.target.value })}
          />
        </Field>
      </article>
      {team.map((item, index) => (
        <article key={item.id} className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>{String(index + 2).padStart(2, '0')}</p>
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={() => requestRemove(item)}
            >
              {de.wizard.remove}
            </button>
          </div>
          <Field label={de.wizard.steps.team.name} htmlFor={`${item.id}-name`} optional>
            <input
              id={`${item.id}-name`}
              className={styles.input}
              value={item.name}
              onChange={(event) => saveMember(item.id, { name: event.target.value })}
            />
          </Field>
          <Field label={de.wizard.steps.team.role} htmlFor={`${item.id}-role`} optional>
            <input
              id={`${item.id}-role`}
              className={styles.input}
              value={item.role}
              onChange={(event) => saveMember(item.id, { role: event.target.value })}
            />
          </Field>
          <Field
            label={de.wizard.steps.team.description}
            htmlFor={`${item.id}-copy`}
            optional
          >
            <textarea
              id={`${item.id}-copy`}
              className={styles.textarea}
              value={item.description}
              onChange={(event) =>
                saveMember(item.id, { description: event.target.value })
              }
            />
          </Field>
          <Field label={de.wizard.steps.team.story} htmlFor={`${item.id}-story`} optional>
            <textarea
              id={`${item.id}-story`}
              className={styles.textarea}
              value={item.story}
              onChange={(event) => saveMember(item.id, { story: event.target.value })}
            />
          </Field>
        </article>
      ))}
      <button type="button" className="btn btn-secondary" onClick={addMember}>
        {de.wizard.steps.team.add}
      </button>
      <ConfirmDialog
        open={pendingId !== null}
        title={de.wizard.deleteMember.title}
        body={de.wizard.deleteMember.body}
        cancelLabel={de.confirm.cancel}
        confirmLabel={de.wizard.deleteMember.confirm}
        onCancel={() => setPendingId(null)}
        onConfirm={() => {
          if (pendingId) removeMember(pendingId);
        }}
      />
    </div>
  );
}
