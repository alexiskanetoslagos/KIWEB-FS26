$(document).ready(function() {

    $('#menu__overlay').on ('click', activatemenu);

        function activatemenu () {
            $('#overlay').toggleClass('active');
        }

        $('#menu__language').on ('click', activatelanguagemenu);

        function activatelanguagemenu () {
            $('#language__switch').toggleClass('active');
        }

    })