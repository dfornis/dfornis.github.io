// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-publications",
          title: "Publications",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-projects",
          title: "Projects",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-i-m-presenting-an-upcoming-paper-tax-exemptions-for-drop-in-biofuels-and-transport-decarbonisation-evidence-from-sweden-at-the-2026-iaee-european-conference-in-september",
          title: 'I’m presenting an upcoming paper, Tax Exemptions for Drop-In Biofuels and Transport Decarbonisation:...',
          description: "",
          section: "News",},{id: "news-i-m-presenting-work-on-estimating-the-effect-of-datacenter-deployment-on-electricity-prices-in-the-nordics-and-impacts-on-industrial-output-at-the-energy-amp-amp-climate-modeling-forum-ecemp-https-www-sciencedirect-com-science-article-pii-s2214629626004524-https-www-ecmf-eu-ecemp-ecemp-2026",
          title: 'I’m presenting work on estimating the effect of datacenter deployment on electricity prices...',
          description: "",
          section: "News",},{id: "news-new-paper-published-in-energy-research-amp-amp-social-science-the-politics-of-baselines-a-political-feasibility-framework-for-energy-and-climate-scenarios-available-here",
          title: 'New paper published in Energy Research &amp;amp;amp; Social Science: The politics of baselines:...',
          description: "",
          section: "News",},{id: "projects-nordic-datacenter-tracker",
          title: 'Nordic datacenter tracker',
          description: "Public database with plans and electricity use estimates for new datacenters across the Nordics.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/datacenter-tracker/";
            },},{id: "projects-drivetrain-transition-policy-scenarios",
          title: 'Drivetrain transition policy scenarios',
          description: "Interactive policy scenarios for projected Swedish new-car sales shares by drivetrain.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/drivetrain-demand-model/";
            },},{id: "projects-political-feasibility-in-energy-and-climate-scenarios",
          title: 'Political feasibility in energy and climate scenarios',
          description: "An interactive introduction to a framework for identifying plausible policy trajectories and comparing their political feasibility, illustrated through Swedish datacenter policy.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/political-feasibility/";
            },},{id: "teachings-data-science-fundamentals",
          title: 'Data Science Fundamentals',
          description: "This course covers the foundational aspects of data science, including data collection, cleaning, analysis, and visualization. Students will learn practical skills for working with real-world datasets.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/data-science-fundamentals/";
            },},{id: "teachings-introduction-to-machine-learning",
          title: 'Introduction to Machine Learning',
          description: "This course provides an introduction to machine learning concepts, algorithms, and applications. Students will learn about supervised and unsupervised learning, model evaluation, and practical implementations.",
          section: "Teachings",handler: () => {
              window.location.href = "/teachings/introduction-to-machine-learning/";
            },},];
