"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/journal/button";
import { Checkbox } from "@/components/journal/checkbox";
import { FocusFrame } from "@/components/journal/ink";
import { PaperPanel } from "@/components/journal/paper-panel";
import { TextInput } from "@/components/journal/text-input";
import { useTodos } from "@/lib/studyroom/use-todos";
import { TrashIcon } from "./icons";
import { Nail } from "./nail";
import styles from "./studyroom.module.css";

const MAX_TITLE = 120;

/** To-do: a lined notepad sheet on the potting bench (here the user
    writes), nailed to the wood, its name on the first line. Every to-do
    sits on a line of the pad; the next free line takes a new one. Open
    to-dos first, the ones ticked off today below them, struck through in
    ink. Stored in `todos`. The list scrolls inside the paper on desktop,
    snapping line by line so the writing stays on the rules. "Add" is
    always a live button — with an empty line it simply does nothing. */
export function TodoNote({
  nail = true,
  tilt = 1,
}: {
  /** false in the bar layout's panel, which opens over the garden. */
  nail?: boolean;
  tilt?: number;
} = {}) {
  const { todos, error, add, setDone, remove } = useTodos();
  const [draft, setDraft] = useState("");

  // Open first, done after — each group in the order it was written.
  const sorted = useMemo(
    () =>
      todos
        ? [...todos.filter((t) => !t.done), ...todos.filter((t) => t.done)]
        : null,
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
    <>
      <PaperPanel
        as="section"
        variant="lined"
        padding="sm"
        tilt={tilt}
        aria-labelledby="todo-title"
        className={styles.note}
      >
        <h2 id="todo-title" className={styles.noteTitle}>
          To-do
        </h2>

        {sorted && sorted.length === 0 && !error && (
          <p className={styles.noteEmpty}>Nothing on the list.</p>
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

        {/* The next free line of the pad. */}
        <form className={styles.todoForm} onSubmit={handleSubmit}>
          <TextInput
            label="New"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_TITLE}
            autoComplete="off"
            aria-label="New to-do"
            className={styles.todoField}
          />
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </PaperPanel>
      {/* Outside the paper's content box, so the pad's line grid leaves
          it alone. */}
      {nail && <Nail className={styles.noteNail} />}
    </>
  );
}
