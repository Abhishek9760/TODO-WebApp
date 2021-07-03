<script>
  export let todosLength;
  export let theme;
  export let setState;
  export let clearCompleted;

  export let state;
</script>

<style>
  footer {
    display: flex;
    justify-content: space-between;
    color: var(--greyesh-blue-1);
    height: 50px;
    align-items: center;
    padding: 1rem;
    font-size: 0.8rem;
    font-weight: 700;
    border-bottom-left-radius: 5px;
    border-bottom-right-radius: 5px;
  }
  @media only screen and (max-width: 767px) {
    .states {
      position: absolute;
      bottom: -65px;
      left: 0;
      padding: 15px;
      width: 100%;
      justify-content: space-around;
      align-items: center;
      border-radius: 5px;
    }
  }
  .states {
    display: flex;
    justify-content: space-around;
  }

  .states > p:not(:last-child) {
    padding-right: 0.8rem;
  }

  .active {
    color: var(--bright-blue);
  }
</style>

<footer
  class:light-list-bg={theme === "light"}
  class:dark-list-bg={theme === "dark"}
  class:footer-text-light={theme === "dark"}
  class:footer-text-dark={theme === "light"}
>
  <span>{todosLength} items left</span>
  <div
    class="states"
    class:light-list-bg={theme === "light"}
    class:dark-list-bg={theme === "dark"}
    class:footer-text-light={theme === "dark"}
    class:footer-text-dark={theme === "light"}
  >
    <p on:click={() => setState("all")} class:active={state === "all"}>All</p>
    <p on:click={() => setState("active")} class:active={state === "active"}>
      Active
    </p>
    <p
      on:click={() => setState("completed")}
      class:active={state === "completed"}
    >
      Completed
    </p>
  </div>
  <p on:click={clearCompleted}>Clear Completed</p>
</footer>
