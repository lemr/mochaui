/*
 ---

 name: Menu

 script: menu.js

 description: MUI.Menu - Creates a toolbar dock control.

 copyright: (c) 2011 Contributors in (/AUTHORS.txt).

 license: MIT-style license in (/MIT-LICENSE.txt).

 requires:
 - Core/Element
 - Core/Class
 - Core/Options
 - Core/Events
 - MUI
 - MUI.Core

 provides: [MUI.Menu]
 ...
 */

MUI.Menu = new NamedClass('MUI.Menu', {

	Implements: [Events, Options],

	options: {
		id:				'',				// id of the primary element, and id os control that is registered with mocha
		container:		null,			// the parent control in the document to add the control to
		drawOnInit:		true,			// true to add tree to container when control is initialized
		partner:		false,			// default partner element to send content to
		partnerMethod:	'xhr',			// default loadMethod when sending content to partner
		fromHTML:		false,			// default false, true to load menu from html

		content:		false,			// used to load content
		items:			{},				// menu items for the menu to draw

		cssClass:		'mui-menu',		// css tag to add to control
		divider:		true,			// true if this toolbar has a divider
		orientation:	'left'			// left or right side of dock.  default is left

		//onDrawBegin:null				// event: called when menu is just starting to be drawn
		//onDrawEnd:null				// event: called when menu is has just finished drawing
		//onItemDrawBegin:null			// event: called when menu item is just starting to be drawn
		//onItemDrawEnd:null			// event: called when menu item is has just finished drawing
		//onItemClicked:null			// event: when a menu item is clicked
		//onItemFocused:null			// event: when a menu gains focus
		//onItemBlurred:null			// event: when a menu losses focus
	},

	initialize: function(options){
		this.setOptions(options);
		this.el = {};

		// If menu has no ID, give it one.
		var id = this.id = this.options.id = this.options.id || 'menu' + (++MUI.idCount);
		MUI.set(id, this);

		if (this.options.drawOnInit && !self.fromHTML) this.draw();
		else if (self.fromHTML){
			window.addEvent('domready', function(){
				var el = $(id);
				if (el != null) self.fromHTML(el);
			});
		}
	},

	draw: function(container){
		this.fireEvent('drawBegin', [this]);
		var o = this.options;
		if (!container) container = o.container;

		// determine element for this control
		var isNew = false;
		var div = o.element ? o.element : $(o.id);
		if (!div){
			div = new Element('div', {'id': o.id});
			isNew = true;
		}
		div.empty();

		div.addClass('mui-toolbar');
		if (o.cssClass) div.addClass(o.cssClass);
		if (o.divider) div.addClass('mui-divider');
		if (o.orientation) div.addClass(o.orientation);

		this.el.element = div.store('instance', this);
		var ul = new Element('ul').inject(div);

		this._buildItems(ul, o.items, false);

		// add to container
		var addToContainer = function(){
			if (typeOf(container) == 'string') container = $(container);
			if (div.getParent() == null) div.inject(container);
			this.fireEvent('drawEnd', [this]);
		}.bind(this);
		if (!isNew || typeOf(container) == 'element') addToContainer();
		else window.addEvent('domready', addToContainer);

		return this;
	},

	_buildItems:function(ul, items, addArrow){
		for (var i = 0; i < items.length; i++){
			this.fireEvent('itemDrawBegin', [this, item]);
			var item = items[i];
			if (item.type == 'divider') continue;
			var li = new Element('li').inject(ul);
			if (i > 0 && items[i - 1].type == 'divider') li.addClass('mui-divider');
			var a = new Element('a', {text:item.text}).inject(li);
			if (item.type == 'radio') new Element('div', {'class':(item.selected ? 'radio' : 'noradio')}).inject(a);
			if (item.type == 'check') new Element('div', {'class':(item.selected ? 'check' : 'nocheck')}).inject(a);

			// add anchor target
			if (item.target) a.setAttribute('target', item.target);

			// capture click, and suppress anchor action if there is no target
			if (!item.target) a.addEvent('click', MUI.getWrappedEvent(this, this.onItemClick, [item]));

			// determine partner settings
			var partner = item.partner ? item.partner : this.options.partner;
			var partnerMethod = item.partnerMethod ? item.partnerMethod : this.options.partnerMethod;

			var url = MUI.replacePaths(item.url);
			if (!url || item.registered){
				url = '#';
				if (item.registered && item.registered != '')
					a.addEvent('click', MUI.getRegistered(this, item.registered, [item]));
			} else if (item.partner) a.addEvent('click', MUI.sendContentToPartner(this, url, partner, partnerMethod));
			else a.setAttribute('href', url);

			a.addEvent('mouseleave', function(e){ e.stop();});
			li.addEvent('mouseenter', function(e){
				var ul = e.target.getParent('ul');
				ul.getChildren('li').removeClass('hover');
				ul=this.getChildren('UL');
				this.addClass('hover');
			}).addEvent('mouseleave', function(e){
				this.removeClass('hover');
			});

			if (item.items && item.items.length > 0){
				if (addArrow) a.addClass('arrow-right');
				var ul2 = new Element('ul').inject(li);
				this._buildItems(ul2, item.items, true);
			}

			if (item.id) a.setAttribute('id', item.id);

			this.fireEvent('itemDrawEnd', [this, item]);
		}
	},

	onItemClick: function(e, item){
		if (!item.target) e = new Event(e).stop();
		self.fireEvent('itemClicked', [this, item, e]);
		return true;
	},

	onItemFocus: function(e, item){
		self.fireEvent('itemFocused', [this, item, e]);
		return true;
	},

	onItemBlur: function(e, item){
		self.fireEvent('itemBlurred', [this, item, e]);
		return true;
	},

	fromHTML: function(div){
		var self = this,o = this.options;

		if (!div) div = $(o.id);
		if (!div) return self;
		if (div.get('class')) o.cssClass = div.get('class');

		var ul = div.getChildren("ul");
		if (ul.length > 0) o.items = this._fromHtmlChildren(ul[0]);

		self.draw();
		return self;
	},

	_fromHtmlChildren: function(ul){
		var list = [];
		Object.each(ul.getChildren('li'), function(li){
			if (typeof(li) != 'object' && typeof(li) != 'element') return;
			if (li.hasClass('divider') || li.hasClass('mui-divider')) list.push({'type':'divider'});
			var item = {};
			var a = li.getChildren('a');
			item.text = a.get('text');
			if (!item.text) return;
			var tgt = a.get("target");
			if (tgt) item.target = tgt;
			var href = a.get("href");
			if (href) item.url = href;

			var subul = li.getChildren('ul');
			if (subul && subul.length > 0) item.items = this._fromHtmlChildren(subul[0]);

			list.push(item);
		}, this);
		return list;
	}
});

