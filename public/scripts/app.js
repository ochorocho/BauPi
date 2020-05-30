let pictureDropDown = document.querySelector('.js-picture-dropdown');

if(pictureDropDown) {
  pictureDropDown.addEventListener('change', function () {
    window.location = '/pictures/' + this.value;
  })
}
