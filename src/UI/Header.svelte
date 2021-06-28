<script>
    export let theme;
</script>

<style>
    header {
        width: 100%;
        height: 40%;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: 26%;
    }

    .dark-img {
        background-image: url("/images/bg-desktop-dark.jpg");
    }
    .light-img {
        background-image: url("/images/bg-desktop-light.jpg");
    }
    @media (max-width: 400px) {
        header {
            height: 35%;
        }
    }
</style>

<header class:dark-img={theme === 'dark'} class:light-img={theme === 'light'}>
    <slot />
</header>
