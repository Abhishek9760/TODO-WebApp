<script>
  export let theme;
</script>

<style>
  .heading {
    display: flex;
    /* flex: 2; */
    justify-content: center;
    align-items: center;
    width: 100%;
    justify-content: space-between;
  }

  h1 {
    color: #fff;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: 8px;
  }
</style>

<div class="heading">
  <h1>TODO</h1>
  {#if theme === "dark"}
    <img on:click src="/images/icon-sun.svg" alt="" />
  {:else}<img on:click src="/images/icon-moon.svg" alt="" />{/if}
</div>
