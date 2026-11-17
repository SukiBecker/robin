import { Button } from "@/components/button";
import { TrashIcon } from "./icons";
import { Slip } from "./slip";
import styles from "./studyroom.module.css";

// Static placeholder entries for the To-Do card until V2 adds real tasks.
const SAMPLE_TODOS = [
  { id: "1", text: "Read chapter 3", done: true },
  { id: "2", text: "Summarize lecture notes", done: false },
  { id: "3", text: "Practice exercises 4–6", done: false },
];

/** To-do slip. Layout only — adding, checking off and deleting get wired up
 *  (with storage) in V2. */
export function TodoSlip() {
  return (
    <Slip id="todo" title="To-do" tilt={1}>
      <form
        className={styles.todoForm}
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="text"
          className={styles.todoInput}
          placeholder="Add a task…"
          aria-label="New task"
        />
        <Button type="submit" variant="tonal" size="sm">
          Add
        </Button>
      </form>

      <ul className={styles.todoList}>
        {SAMPLE_TODOS.map((todo) => (
          <li key={todo.id} className={styles.todoItem}>
            <label className={styles.todoLabel}>
              <input
                type="checkbox"
                className={styles.todoCheckbox}
                defaultChecked={todo.done}
              />
              <span className={styles.todoText}>{todo.text}</span>
            </label>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Delete “${todo.text}”`}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </Slip>
  );
}
