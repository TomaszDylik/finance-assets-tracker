/* ============================================
   Centrum Nowych Inwestycji — script.js
   Hamburger menu + Carousel + Cert Carousel + Nav shadow
   ============================================ */

(function () {
  'use strict';

  // ---- Hamburger Menu ----
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    var links = navLinks.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        navLinks.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    }
  }

  // ---- Nav Shadow on Scroll ----
  var nav = document.getElementById('navbar');

  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        nav.classList.add('nav--shadow');
      } else {
        nav.classList.remove('nav--shadow');
      }
    });
  }

  // ---- Testimonials Carousel ----
  var slides = document.querySelectorAll('.carousel__slide');
  var prevBtn = document.querySelector('.carousel__btn--prev');
  var nextBtn = document.querySelector('.carousel__btn--next');
  var dotsContainer = document.getElementById('carouselDots');
  var currentSlide = 0;

  if (slides.length > 0 && dotsContainer) {
    // Create dots
    for (var j = 0; j < slides.length; j++) {
      var dot = document.createElement('button');
      dot.className = 'carousel__dot' + (j === 0 ? ' carousel__dot--active' : '');
      dot.setAttribute('aria-label', 'Opinia ' + (j + 1));
      dot.dataset.index = j;
      dotsContainer.appendChild(dot);
    }

    var dots = dotsContainer.querySelectorAll('.carousel__dot');

    function goToSlide(index) {
      slides[currentSlide].classList.remove('carousel__slide--active');
      dots[currentSlide].classList.remove('carousel__dot--active');
      currentSlide = (index + slides.length) % slides.length;
      slides[currentSlide].classList.add('carousel__slide--active');
      dots[currentSlide].classList.add('carousel__dot--active');
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goToSlide(currentSlide - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goToSlide(currentSlide + 1);
      });
    }

    // Dot click
    dotsContainer.addEventListener('click', function (e) {
      var target = e.target.closest('.carousel__dot');
      if (target) {
        goToSlide(parseInt(target.dataset.index, 10));
      }
    });

    // Auto-advance every 6 seconds
    var autoPlay = setInterval(function () {
      goToSlide(currentSlide + 1);
    }, 6000);

    // Pause on hover
    var carousel = document.querySelector('.carousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', function () {
        clearInterval(autoPlay);
      });
      carousel.addEventListener('mouseleave', function () {
        autoPlay = setInterval(function () {
          goToSlide(currentSlide + 1);
        }, 6000);
      });
    }
  }

  // ---- Contact Form Validation ----
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      var email = document.getElementById('email');
      var phone = document.getElementById('phone');
      var consent = document.getElementById('consent');
      var errors = [];

      if (!email || !email.value.trim()) {
        errors.push('Podaj adres e-mail.');
      }
      if (!phone || !phone.value.trim()) {
        errors.push('Podaj numer telefonu.');
      }
      if (!consent || !consent.checked) {
        errors.push('Zaakceptuj Politykę Prywatności.');
      }

      if (errors.length > 0) {
        e.preventDefault();
        alert(errors.join('\n'));
      }
    });
  }
})();