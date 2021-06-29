<script>
  import Header from "./UI/Header.svelte";
  import Heading from "./UI/Heading.svelte";
  import Input from "./UI/Input.svelte";
  import Card from "./UI/Card.svelte";
  import TodoList from "./UI/TodoList.svelte";
  import Footer from "./UI/Footer.svelte";

  let theme = "dark";
  let state = "all";
  let todos = [
    { text: "Gym at morning after 11.", id: 1, completed: true },
    { text: "Breakfast at 11:30", id: 2, completed: false },
    { text: "Study at 1pm", id: 3, completed: false },
  ];
  $: activeTodos = todos.filter((t) => !t.completed);
  $: completedTodos = todos.filter((t) => t.completed);

  let todoText = "";

  function changeTheme() {
    theme = theme === "dark" ? "light" : "dark";
  }

  function deleteTodo(id) {
    todos = todos.filter((todo) => todo.id !== id);
  }

  function addTodo(event) {
    if (event.which !== 13) {
      return;
    }
    let newTodo = {
      text: todoText,
      id: todos.length + 1,
      completed: false,
    };
    todos = [...todos, newTodo];
    todoText = "";
  }

  function setCompleted(id) {
    let newTodos = [...todos];
    newTodos.forEach((t) => {
      if (t.id === id) {
        t.completed = !t.completed;
      }
    });
    todos = [...newTodos];
  }

  function setState(s) {
    if (state !== s) {
      state = s;
    }
  }

  function clearCompleted() {
    let filteredTodos = todos.filter((t) => !t.completed);
    todos = filteredTodos;
  }

  function getList(state, todos) {
    if (state === "all") {
      return todos;
    } else if (state === "active") {
      return activeTodos;
    } else {
      return completedTodos;
    }
  }

  $: myTodoList = getList(state, todos);
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

  @media only screen and (max-width: 767px) and (orientation: portrait) {
    /* portrait phones */
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
    <TodoList
      on:completed={(e) => setCompleted(e.detail)}
      {deleteTodo}
      todos={myTodoList}
      {theme}
    />
    <Footer
      {state}
      {setState}
      {clearCompleted}
      {theme}
      todosLength={myTodoList.length}
    />
  </Card>
</div>
