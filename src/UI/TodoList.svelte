<script>
  import TodoListItem from "./TodoListItem.svelte";
  export let theme;
  export let todos;
  export let deleteTodo;
</script>

<style>
  ul {
    list-style: none;
    font: inherit;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    max-height: 350px;
  }
</style>

<ul
  class:light-list-bg={theme === "light"}
  class:dark-list-bg={theme === "dark"}
  class="list"
  class:light-text={theme === "light"}
  class:dark-text={theme === "dark"}
>
  {#each todos as todo, index (todo.id)}
    <TodoListItem
      on:completed
      on:tododelete={(e) => deleteTodo(e.detail)}
      {theme}
      {todo}
    />
  {/each}
</ul>
