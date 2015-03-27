(function() {
  var __slice = [].slice;

  (function($, window) {
    var methods;
    methods = {
      init: function() {
        return this.each(function() {
          var $hidden, $input, $this;
          $this = $(this);
          $hidden = $("<input>", {
            type: "hidden",
            "class": "ui-checkable",
            name: $this.data("name"),
            value: 0
          });
          $hidden.appendTo($this);
          $input = $("<input>", {
            type: "checkbox",
            "class": "ui-checkable",
            value: 1,
            name: $this.data("name"),
            checked: $this.data("checked")
          });
          $input.css({
            position: "absolute",
            visibility: "hidden",
            top: "-9999px"
          });
          $input.appendTo($this);
          $this.on("click", function(event) {
            $this.toggleClass("ui-checked");
            return $input.prop("checked", $this.hasClass("ui-checked"));
          });
          $this.on("mouseenter mouseleave", function() {
            return $this.toggleClass("ui-hover");
          });
          return $this.on("mousedown", function() {
            $this.addClass("ui-pressed");
            return $(document).one("mouseup", function() {
              return $this.removeClass("ui-pressed");
            });
          });
        });
      },
      value: function(checked) {
        var $this;
        if (!checked) {
          $this = $(this);
          return $this.find("input[type=checkbox].ui-checkable").prop("checked");
        } else {
          return this.each(function() {
            $this = $(this);
            $this.toggleClass("ui-checked", checked);
            return $this.find("input[type=checkbox].ui-checkable").prop("checked", checked);
          });
        }
      }
    };
    return $.fn.extend({
      checkable: function() {
        var args, method;
        method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (methods[method]) {
          return methods[method].apply(this, args);
        } else if (typeof method === "object" || !method) {
          return methods.init.apply(this, method);
        }
      }
    });
  })(window.jQuery, window);

}).call(this);
