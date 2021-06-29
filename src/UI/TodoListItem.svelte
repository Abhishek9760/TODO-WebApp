<script>
  import { createEventDispatcher } from "svelte";

  export let todo;
  export let theme;

  const dispatch = createEventDispatcher();
</script>

<style>
  li {
    display: block;
    padding: 20px;
    position: relative;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--grey-1);
  }
  li:hover span.remove {
    opacity: 1;
  }

  span {
    display: inline-block;
  }

  span.add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    transition: backgound 0.3s linear;
  }

  .border {
    border: 1px solid var(--grey-1);
    padding: 1px;
  }

  span.add:hover {
    background-image: linear-gradient(
      -45deg,
      var(--gradient-1),
      var(--gradient-2)
    );
    background-repeat: no-repeat;
    background-size: contain;
    border: none;
  }

  span.add div {
    height: 100%;
    width: 100%;
    border-radius: inherit;
  }

  img {
    height: 50%;
    width: 50%;
    display: inline-block;
  }
  .tick {
    background-image: linear-gradient(
      -45deg,
      var(--gradient-1),
      var(--gradient-2)
    );
    display: grid;
    place-items: center;
  }

  .completed {
    text-decoration: line-through;
  }

  span.remove {
    content: "";
    opacity: 0;
    height: 1.5rem;
    width: 1.5rem;
    background-image: url("./images/icon-cross.svg");
    background-repeat: no-repeat;
    background-size: contain;
    position: absolute;
    right: 20px;
    transition: all 0.2s linear;
  }

  li p {
    margin-left: 15px;
    font-size: 1rem;
  }
  @media only screen and (max-width: 500px) {
    li {
      padding: 15px;
    }
  }
</style>

<li>
  <span
    class="add"
    class:border={!todo.completed}
    on:click={() => dispatch("completed", todo.id)}
  >
    <div
      class:tick={todo.completed}
      class:light-list-bg={theme === "light" && !todo.completed}
      class:dark-list-bg={theme === "dark" && !todo.completed}
    >
      {#if todo.completed}
        <img src="./images/icon-check.svg" alt="" />{/if}
    </div>
  </span>
  <p class:completed={todo.completed}>{todo.text}</p>
  <span class="remove" on:click={() => dispatch("tododelete", todo.id)} />
</li>
