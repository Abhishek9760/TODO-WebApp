<script>
  import { scale } from "svelte/transition";
  import { flip } from "svelte/animate";
  import TodoListItem from "./TodoListItem.svelte";
  export let theme;
  export let todos;
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
    overflow-x: hidden;
  }
</style>

<ul
  class:light-list-bg={theme === "light"}
  class:dark-list-bg={theme === "dark"}
  class="list"
  class:light-text={theme === "light"}
  class:dark-text={theme === "dark"}
>
  {#each todos as todo (todo.id)}
    <div transition:scale animate:flip={{ duration: 300 }}>
      <TodoListItem on:completed {theme} {todo} />
    </div>
  {/each}
</ul>
