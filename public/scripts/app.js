let pictureDropDown = document.querySelector('.js-picture-dropdown');

pictureDropDown.addEventListener('change', function () {
  window.location = '/pictures/' + this.value;
})
