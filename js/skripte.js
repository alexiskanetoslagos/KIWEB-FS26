$(document).ready(function() {

        function initScrollRevealSteps() {
            var $steps = $('.scroll-reveal-step');
            var $images = $('.scroll-reveal-image');

            if ($steps.length === 0 && $images.length === 0) {
                return;
            }

            if (typeof scrollama !== 'function') {
                // Keep content visible if Scrollama is unavailable.
                $steps.addClass('is-visible');
                $images.addClass('is-visible');
                return;
            }

            var textScroller = scrollama();
            var imageScroller = scrollama();

            $('body').addClass('scrollama-ready');

            if ($steps.length > 0) {
                textScroller
                    .setup({
                        step: '.scroll-reveal-step',
                        offset: 0.72,
                        once: false
                    })
                    .onStepEnter(function(response) {
                        $(response.element).addClass('is-visible');
                    })
                    //.onStepExit(function(response) {
                    //    $(response.element).removeClass('is-visible');
                    //});
            }

            if ($images.length > 0) {
                imageScroller
                    .setup({
                        step: '.scroll-reveal-image',
                        offset: 0.8,
                        once: true
                    })
                    .onStepEnter(function(response) {
                        var $element = $(response.element);
                        var staggerDelay = parseInt($element.attr('data-stagger') || '0', 10);

                        setTimeout(function() {
                            $element.addClass('is-visible');
                        }, Math.max(0, staggerDelay));
                    });
            }

            $(window).on('resize', function() {
                textScroller.resize();
                imageScroller.resize();
            });
        }



        function initThumbnailStack(containerSelector, largeImageSelector) {
            var $container = $(containerSelector);
            var $thumbnails = $(containerSelector).find('img');
            var $largeImage = $(largeImageSelector);
            var activeIndex = 0;
            var lastWheelAt = 0;
            var imageSwapToken = 0;
            var preloadCache = {};

            if ($thumbnails.length === 0) {
                return;
            }

            function setActiveIndex(nextIndex) {
                activeIndex = Math.max(0, Math.min(nextIndex, $thumbnails.length - 1));
                applyActiveLayout(activeIndex);
                syncLargeImage(activeIndex);
                scrollActiveThumbnailIntoView();
            }

            function scrollActiveThumbnailIntoView() {
                if (!window.matchMedia('(max-width: 1024px)').matches) {
                    return;
                }

                var container = $container[0];
                var activeThumb = $thumbnails.eq(activeIndex)[0];

                if (!container || !activeThumb) {
                    return;
                }

                var targetScrollLeft = activeThumb.offsetLeft - (container.clientWidth / 2) + (activeThumb.offsetWidth / 2);
                var maxScrollLeft = container.scrollWidth - container.clientWidth;

                targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

                if (typeof container.scrollTo === 'function') {
                    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
                } else {
                    container.scrollLeft = targetScrollLeft;
                }
            }

            function preloadLargeImages() {
                $thumbnails.each(function() {
                    var mappedSrc = $(this).attr('data-large-src');
                    var mobileSrc = $(this).attr('data-mobile-src');

                    if (!mappedSrc || preloadCache[mappedSrc]) {
                        return;
                    }

                    var preloadImage = new Image();
                    preloadImage.src = mappedSrc;
                    preloadCache[mappedSrc] = preloadImage;

                    if (mobileSrc && !preloadCache[mobileSrc]) {
                        var mobilePreloadImage = new Image();
                        mobilePreloadImage.src = mobileSrc;
                        preloadCache[mobileSrc] = mobilePreloadImage;
                    }
                });
            }

            function getResponsiveLargeSrc($thumb) {
                var mobileSrc = $thumb.attr('data-mobile-src');
                var desktopSrc = $thumb.attr('data-large-src');

                if (window.matchMedia('(max-width: 1024px)').matches && mobileSrc) {
                    return mobileSrc;
                }

                return desktopSrc;
            }

            function syncLargeImage(index) {
                if ($largeImage.length === 0) {
                    return;
                }

                var $activeThumb = $thumbnails.eq(index);
                var largeSrc = getResponsiveLargeSrc($activeThumb);
                var largeAlt = $activeThumb.attr('data-large-alt') || $activeThumb.attr('alt');

                // Only switch when an explicit large-image mapping exists.
                if (!largeSrc) {
                    return;
                }

                var currentSrc = $largeImage.attr('src') || '';

                if (currentSrc === largeSrc) {
                    if (typeof largeAlt !== 'undefined') {
                        $largeImage.attr('alt', largeAlt);
                    }
                    return;
                }

                var $swapContainer = $largeImage.parent();
                var $overlay = $largeImage.clone();

                $swapContainer.find('.image-fade-overlay').remove();

                $overlay
                    .addClass('image-fade-overlay')
                    .removeClass('is-fading-out')
                    .attr('src', currentSrc)
                    .attr('alt', $largeImage.attr('alt') || '');

                $swapContainer.append($overlay);

                function runCrossfade() {
                    $largeImage.attr('src', largeSrc);

                    if (typeof largeAlt !== 'undefined') {
                        $largeImage.attr('alt', largeAlt);
                    }

                    // Force a reflow so opacity transition always runs.
                    void $overlay[0].offsetWidth;
                    $overlay.addClass('is-fading-out');

                    $overlay.on('transitionend webkitTransitionEnd', function() {
                        $(this).remove();
                    });
                }

                if (preloadCache[largeSrc] && preloadCache[largeSrc].complete) {
                    runCrossfade();
                } else {
                    var preloadedImage = preloadCache[largeSrc] || new Image();
                    preloadCache[largeSrc] = preloadedImage;

                    preloadedImage.onload = runCrossfade;
                    preloadedImage.onerror = function() {
                        $largeImage.attr('src', largeSrc);

                        if (typeof largeAlt !== 'undefined') {
                            $largeImage.attr('alt', largeAlt);
                        }

                        $overlay.remove();
                    };

                    if (!preloadedImage.src) {
                        preloadedImage.src = largeSrc;
                    }
                }
            }

            function getTopEdgeSpacingMargin() {
                var thumbHeight = $thumbnails.first().outerHeight();

                if (!thumbHeight || thumbHeight <= 50) {
                    return 50;
                }

                // Next thumbnail starts 50px below the top edge of the previous one.
                return -(thumbHeight - 50);
            }

            function applyActiveLayout(activeIndex) {
                var topEdgeSpacingMargin = getTopEdgeSpacingMargin();
                var isMobile = window.matchMedia('(max-width: 1024px)').matches;

                $thumbnails.removeClass('is-active');

                $thumbnails.each(function(index) {
                    // On mobile, clear any inline margins (CSS handles horizontal layout).
                    // On desktop, apply the vertical stacking effect.
                    if (isMobile) {
                        $(this).css('margin-top', '');
                    } else {
                        var marginTop;

                        if (index === 0) {
                            marginTop = 0;
                        } else if (index === activeIndex + 1) {
                            // Keep a 50px gap below the active thumbnail.
                            marginTop = 50;
                        } else {
                            marginTop = topEdgeSpacingMargin;
                        }

                        $(this).css('margin-top', marginTop + 'px');
                    }
                });

                $thumbnails.eq(activeIndex).addClass('is-active');
            }

            $thumbnails.on('click', function() {
                setActiveIndex($thumbnails.index(this));
            });

            $container.on('wheel', function(event) {
                var now = Date.now();
                var originalEvent = event.originalEvent;
                var scrollDelta = originalEvent.deltaY || originalEvent.deltaX || 0;

                if (Math.abs(scrollDelta) < 1) {
                    return;
                }

                if (now - lastWheelAt < 320) {
                    event.preventDefault();
                    return;
                }

                event.preventDefault();
                lastWheelAt = now;

                if (scrollDelta > 0) {
                    setActiveIndex(activeIndex + 1);
                } else {
                    setActiveIndex(activeIndex - 1);
                }
            });

            $(window).on('resize', function() {
                setActiveIndex(activeIndex);
            });

            preloadLargeImages();
            setActiveIndex(0);
        }

        initThumbnailStack('.hero-thumbnails', '.hero-image img');
        initThumbnailStack('.plan-small', '.plan-large img');
        initScrollRevealSteps();

        // Legal Notice Modal Handler
        var $modal = $('#legalNoticeModal');
        var $closeBtn = $('.legal-notice-close');
        var $legalLink = $('.footer-legal-link');

        $legalLink.on('click', function(e) {
            e.preventDefault();
            $modal.addClass('show');
        });

        $closeBtn.on('click', function() {
            $modal.removeClass('show');
        });

        $modal.on('click', function(e) {
            if (e.target === this) {
                $modal.removeClass('show');
            }
        });

    })