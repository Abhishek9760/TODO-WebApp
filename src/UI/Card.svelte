<style>
  .card {
    bottom: 3%;
    display: flex;
    flex-direction: column;
    margin-top: 10px;
    width: 40%;
    margin: auto;
    justify-content: space-around;
    position: relative;
  }

  @media only screen and (max-width: 767px) {
    .card {
      width: 90%;
    }
  }
</style>

<div class="card">
  <slot />
</div>
