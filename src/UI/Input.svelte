<script>
  export let theme;
  export let value;
</script>

<style>
  input {
    height: 100%;
    width: 100%;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    border: none;
    padding: 5px;
    padding-left: 35px;
    font-size: 1rem;
    font-family: inherit;
    caret-color: var(--bright-blue);
  }

  .light-input-bg {
    background-color: var(--input-bg-light);
    color: var(--input-text-dark);
  }
  .dark-input-bg {
    background-color: var(--input-bg-dark);
    color: var(--input-text-light);
  }
  input:focus {
    outline: none;
  }

  span {
    height: 20%;
    display: flex;
    align-self: normal;
    align-items: center;
    justify-content: space-between;
  }

  span div {
    height: 100%;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .front {
    height: 1.5rem;
    width: 1.5rem;
    display: inline-block;
    border-radius: 50%;
    border: 1px solid var(--grey-1);
    position: relative;
    transform: translateX(80%);
  }

  /* @media only screen and (max-height: 700px) and (max-width: 767px) {
    span {
      height: 30%;
    }
  } */
</style>

<span>
  <div
    class:light-input-bg={theme === "light"}
    class:dark-input-bg={theme === "dark"}
  >
    <div class="front" />
  </div>
  <input
    on:input
    on:keydown
    autocomplete="off"
    autocapitalize="off"
    {value}
    placeholder="Create a new todo..."
    class:light-input-bg={theme === "light"}
    class:dark-input-bg={theme === "dark"}
    type="text"
    name=""
    id=""
  />
</span>
