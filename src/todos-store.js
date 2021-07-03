import { writable } from "svelte/store";

let todosList = writable([
  { text: "Gym at morning after 11.", id: 1, completed: true },
  { text: "Breakfast at 11:30", id: 2, completed: false },
  { text: "Study at 1pm", id: 3, completed: false },
]);

const customTodos = {
  subscribe: todosList.subscribe,
  delete: (id) =>
    todosList.update((todos) => todos.filter((todo) => todo.id !== id)),
  add: (text) => {
    let newTodo = {
      text,
      id: Math.random() * 1000,
      completed: false,
    };
    return todosList.update((todos) => [newTodo, ...todos]);
  },
  toggleCompleted: (id) => {
    todosList.update((todos) => {
      let newTodos = [...todos];
      newTodos.forEach((t) => {
        if (t.id === id) {
          t.completed = !t.completed;
        }
      });
      return [...newTodos];
    });
  },
  clearCompleted: () =>
    todosList.update((todos) => todos.filter((t) => !t.completed)),
};

export default customTodos;
