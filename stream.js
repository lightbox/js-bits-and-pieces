(function() {
    var cspace, platform, platform3d, columns, forbiddencolumn, columnwidth, padding, thingswaiting, flowing, hasEver, psc;
    hasEver = false;
    flowing = true;
    var init = function() {
        var ww, columcount, newcolumncount, newcolumnwidth, wait;
        ww = $(window).width();
        spacings = getspacings(ww);
        psc = spacings.photospacing;
        newcolumnwidth = spacings.streamsize;
        newcolumncount = Math.min(8,Math.floor((ww - spacings.contentpadding * 2 - spacings.panelborder * 2 - (spacings.viralwidget ? 70 : 0) + spacings.photospacing) / (newcolumnwidth + spacings.photospacing) ));

        //if it's not absolutely necessary to repaint, we wont:
        if(cspace && cspace.length == newcolumncount && columnwidth == newcolumnwidth) {return;}

        columncount = newcolumncount;
        columnwidth = newcolumnwidth;
        
        forbiddencolumn = -1;
        thingswaiting = 0; //number of photos waiting to load at the moment
        $('#thumbnails').removeClass('loaded').html('');
        cspace = [];
        for(var i=0; i < columncount; i ++) {
            cspace.push(0);
            $('#thumbnails').append('<div class="column" style="margin-left:' + ((columnwidth + spacings.photospacing)*i) + 'px;"></div>');
        }
        $('#content').css({'width':cspace.length * (columnwidth + spacings.photospacing) + spacings.panelborder - spacings.photospacing});
        columns = $('#thumbnails').find('.column');
        if(hasEver) {
            $('#thumbnails').removeClass('loaded');
            $.each(prefill_photos, function(i,photo) {
                if(i < cspace.length * 10) { //we only load as many as columns
                    loadPhoto(photo);
                }
            });
            setTimeout(function() {
                $('#thumbnails').addClass('loaded');
            },100);
        } else {
            wait = 50;
            $.each(prefill_photos, function(i,photo) {
                setTimeout(function() {
                    loadPhoto(photo);
                },wait); //nicely easing into the present
                wait += 50 + i * 20;
            });
            $('#thumbnails').addClass('loaded');
        }
        //we may as well want to wait a few before announcing we're loaded
        hasEver = true;
    }
    platform3d = '';
    forbiddencolumn = -1;

    var generateThumbnail = function(photo, column) {
        var match, version = '', gcs, title, titlehtml;
        photo.title = photo.title.replace(new RegExp("\"",'g'), '&quot;');

        var tmp = fitfillsize([columnwidth, 0], [photo.lrg_width, photo.lrg_height], 'fit');
        cspace[column] -= tmp[1] + psc; //we're not recalculating just for spacing.photospacing
        gcs = {
            style: 'position: absolute; width: '+tmp[0]+'px; height: '+tmp[1]+'px; margin-top:' + cspace[column] + 'px;',
            imgstyle: 'width: inherit; height: inherit;'
        };
        title = photo.title || 'Photo';
        titlehtml = '<div class="title"><span class="padder">'+ title +' by <span style="font-weight:bold">' + photo.user.displayname + '</span></span></div>';
        
        return '<a href="' + photo.url + '" target="_blank" id="photo_' + photo.id + '" class="thumbnail" data-photo_id="' + photo.id + '" data-lrg="' + photo.lrg_url + '" data-width="' + photo.lrg_width + '" data-height="' + photo.lrg_height + '" style="' + gcs.style + '">' + 
        '<span class="like' + (photo.like ? ' active' : '') + '" data-photo_id="' + photo.id + '"></span>' + 
        titlehtml + 
        '<img src="' + photo.med_url + '" alt="' + photo.title + '" style="' + gcs.imgstyle + '" /></a>';
    }
    if (Modernizr.csstransitions && Modernizr.csstransforms) {
        if ($.browser.mozilla) {
            platform = '-moz';
        } else if ($.browser.webkit) {
            platform = '-webkit';
        } else if ($.browser.opera) {
            platform = '-o';
        } else if ($.browser.msie) {
            platform = '-ms';
        }
        if(Modernizr.csstransforms3d) {
            platform3d = '3d';
        }
    } else {
        platform = 'dumbo';
    }

    var loadPhoto = function(photo) {
        if(thingswaiting > 20) {return;} //if too many things are waiting to load, we bail.
        if($('#photoflipper:visible').length) {return;}
        var img;
        img = $('<img>');
        img.load(function() {img = undefined; addPhoto(photo); thingswaiting -= 1;});
        setTimeout(function() {
            if(img) {
                //still not loaded!
                thingswaiting -= 1;
            }
        },5000);
        img.attr('src', photo.med_url);
        thingswaiting += 1;
    }
    var addPhoto = function(photo) {
        var i,maxh, maxi;
        if(!flowing) {return;}
        if($('#photo_' + photo.id).length) {return;}
        var columnstyle;
        maxh = cspace[0]; maxi = -1;
        for(i=0; i < cspace.length; i++) {
            if(i != forbiddencolumn) {
                if(cspace[i] >= maxh) {maxh=cspace[i]; maxi=i}
            }
        }
        columnchosen = maxi;
        thm = generateThumbnail(photo, columnchosen);
        $('#thumbnails .column:eq('+columnchosen+')').prepend(thm);
        columnstyle = {};
        if(platform === 'dumbo') {
                columnstyle['margin-top'] = (-cspace[columnchosen])+'px';
        } else {
            if(platform3d) {
                columnstyle[platform+'-transform'] = 'translate3d(0, '+(-cspace[columnchosen])+'px,0)';
            } else {
                columnstyle[platform+'-transform'] = 'translate(0, '+(-cspace[columnchosen])+'px)';
            }
        }
        $('#thumbnails .column:eq('+columnchosen+')').css(columnstyle);
    }

    init();

    channel.bind('new_photo', loadPhoto);

    if(!Modernizr.touch) {
        //we're not moving the column that's hovered over
        $('#thumbnails .column').hover(function() {
            forbiddencolumn = $('#thumbnails .column').index($(this));
        },function() {
            forbiddencolumn = -1;
        });
    }

    $(window).scroll(function() {
        flowing = !($(window).scrollTop() > 250);
    });

    var reshapedue = false;
    $(window).on(Modernizr.touch ? 'orientationchange' : 'resize', function() {
        if(Modernizr.touch) {
            init();
        } else {
            reshapedue = true;
        }
    });

    setInterval(function() {
        if(reshapedue) {
            reshapedue = false;
            init();
        }
    },300);
    
    setInterval(function() {
        $('#thumbnails .column').each(function() {$(this).find('.thumbnail:gt(10)').remove()});
    },1000*60);

}());