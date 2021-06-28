var ghpages = require("gh-pages");

ghpages.publish(
  "public", // path to public directory
  {
    branch: "gh-pages",
    repo: "https://github.com/Abhishek9760/TODO-WebApp.git", // Update to point to your repository
    user: {
      name: "Abhishek Verma", // update to use your name
      email: "av4programming@gmail.com", // Update to use your email
    },
  },
  () => {
    console.log("Deploy Complete!");
  }
);
