"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/journal/button";
import { Checkbox } from "@/components/journal/checkbox";
import { FocusFrame } from "@/components/journal/ink";
import { TextInput } from "@/components/journal/text-input";
import { useTodos } from "@/lib/studyroom/use-todos";
import { TrashIcon } from "./icons";
import { Slip } from "./slip";
import styles from "./studyroom.module.css";

const MAX_TITLE = 120;

/** To-do slip: open to-dos first, the ones ticked off today below them,
    struck through in ink. Stored in `todos`. */
export function TodoSlip() {
  const { todos, error, add, setDone, remove } = useTodos();
  const [draft, setDraft] = useState("");

  // Open first, done after — each group in the order it was written.
  const sorted = useMemo(
    () => (todos ? [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)] : null),
    [todos]
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    // Clear at once, so the next to-do can be typed while this one is
    // saved; on failure the text comes back (unless something new was
    // typed in the meantime).
    setDraft("");
    const ok = await add(title);
    if (!ok) setDraft((current) => current || title);
  }

  return (
    <Slip id="todo" title="To-do" tilt={1} className={styles.todoSlip}>
      <form className={styles.todoForm} onSubmit={handleSubmit}>
        <TextInput
          label="New to-do"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_TITLE}
          autoComplete="off"
          className={styles.todoField}
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          Add
        </Button>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {sorted && sorted.length === 0 && !error && (
        <p className={styles.body}>Nothing on the list.</p>
      )}

      {sorted && sorted.length > 0 && (
        <ul className={styles.todoList}>
          {sorted.map((todo) => (
            <li key={todo.id} className={styles.todoItem}>
              <Checkbox
                strike
                checked={todo.done}
                onChange={(event) => setDone(todo.id, event.target.checked)}
                className={styles.todoCheck}
              >
                {todo.title}
              </Checkbox>
              <button
                type="button"
                className={styles.todoDelete}
                onClick={() => remove(todo.id)}
                aria-label={`Delete “${todo.title}”`}
              >
                <TrashIcon />
                <FocusFrame className={styles.todoDeleteFocus} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Slip>
  );
}
