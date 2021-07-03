<script>
  import Header from "./UI/Header.svelte";
  import Heading from "./UI/Heading.svelte";
  import Input from "./UI/Input.svelte";
  import Card from "./UI/Card.svelte";
  import TodoList from "./UI/TodoList.svelte";
  import Footer from "./UI/Footer.svelte";
  import todos from "./todos-store";

  let theme = "dark";
  let state = "all";
  let todoText = "";
  let filteredTodos = [];

  $: if (state === "active") {
    filteredTodos = $todos.filter((todo) => !todo.completed);
  } else if (state === "completed") {
    filteredTodos = $todos.filter((todo) => todo.completed);
  } else {
    filteredTodos = $todos;
  }

  function changeTheme() {
    theme = theme === "dark" ? "light" : "dark";
  }

  function addTodo(event) {
    if (event.which !== 13 || todoText.trim().length === 0) {
      return;
    }
    todos.add(todoText);
    todoText = "";
  }

  function setState(s) {
    state = s;
  }
</script>

<style>
  .root {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    padding-bottom: 50px;
  }
  main {
    display: flex;
    flex-direction: column;
    width: 40%;
    margin: auto;
    align-items: center;
    height: 100%;
    justify-content: space-evenly;
    position: relative;
  }

  @media only screen and (max-width: 767px) {
    main {
      width: 90%;
    }
  }
</style>

<div
  class="root"
  class:light-bg={theme === "light"}
  class:dark-bg={theme === "dark"}
>
  <Header {theme}>
    <main>
      <Heading on:click={changeTheme} {theme} />
      <Input
        on:input={(e) => (todoText = e.target.value)}
        value={todoText}
        on:keydown={addTodo}
        {theme}
      />
    </main>
  </Header>
  <Card>
    <TodoList todos={filteredTodos} {theme} />
    <Footer
      todosLength={filteredTodos.length}
      clearCompleted={todos.clearCompleted}
      {state}
      {setState}
      {theme}
    />
  </Card>
</div>
