var util = {
	cumulate: function cumulate (level){
		var count = 0,
			output = 0;
			
		while (count < level){
			count ++;
			output += count;
		}
		
		return output;
	},

	repeat: function repeat (count, string){
		var i, output = "";
		
		for (i = 0; i < count; i++){
			output += string;
		}
		
		return output;
	},
	
	pluck: function pluck (array, value){
		var index = array.indexOf(value);
		if (index < 0) return false;
		
		array.splice(index, 1);
		return true;
	},
	
	deparent: function deparent (key, value){
		if (key == "parent") return undefined;
		else return value;
	},
	
	saveJSON: function saveObject (object, fileName){
		var blob = new Blob([JSON.stringify(object, util.deparent)], {type : "application/json"})
		
		saveAs(blob, fileName);
	},
	
	loadJSON: function loadJSON (file, callback){
		var reader = new FileReader();
		
		reader.readAsText(file);
		reader.onload = function (){
			var output = reader.result;
			output = JSON.parse(output);
			
			callback && callback(output);
		}
	},
	
	parseSTF: function parseSTF (string){
		var blocks = string.split("--"),
			output = {};
		
		blocks.forEach(function (block){
			var object = {};
			block.split("\n").forEach(function (row){
				var row = row.trim(),
					key = /^[^:]*/.exec(row),
					value = /[^:]*$/.exec(row);
				
				key = key && key[0];
				value = value && value[0].trim();
				
				if (key) object[key] = value;
			})
			
			if (object.ID) output[object.ID] = object;
		})
		
		return output;
	},
	
	loadSTF: function loadSTF (url, callback){
		var request = new XMLHttpRequest();
		
		request.onload = function (){
			callback(util.parseSTF(this.responseText));
		};
			
		request.open("get", url);
		request.send();
	}
}

var widgets = {

	editProp: function editProp (entity, key, editMode){
		var div = $("<div class='editProp'>");
		
		function toggle (){
			$(div).find(".displayMode").toggleClass("hidden");
			$(div).find(".editMode").toggleClass("hidden");
		}
		
		div.append(
			widgets.prop(entity, key).addClass("displayMode"),
			
			$("<input type='text' class='editMode hidden'>").val(entity[key])
			.on("change", function (){
				entity[key] = event.target.value;
				$(div).find("prop").text(entity[key]);
				$(div).find("input").blur();
			}).on("blur", function (event){ toggle() }),
			
			$("<button class='editButton displayMode'>").html("-")
			.on("click", function(){
				toggle();
				var value = $(div).find("prop").text();
				$(div).find("input").val(value);
				$(div).find("input").focus();
			})
		)
		
		if (editMode) toggle();
		
		return div;
	},
	
	parse: function parse (string, context){
		var output = $("<span>").html(string);
		
		output.find("prop").each(function (){
			var id = $(this).attr("entity"),
				entity = context,
				key = $(this).attr("key");
			
			$(this).data("entity", entity);
			$(this).data("key", key);
			
			$(this).html(entity[key]);
		})
		
		return output;
	},
	
	prop: function prop (entity, key){
		return $("<prop>")
			.data("entity", entity)
			.data("key", key)
			.html(entity[key]);
	},
	
	stat: function stat (entity, key){
		var statOps = cfg.statOps[key],
			output = $("<span>")
			.html((statOps && statOps.name || key) +" "+ entity[key])
			.addClass("stat "+ key)
			.css("color", statOps && statOps.color);
			
		return output;
	},
	
	newShip: function newShip (){
		var div = $("<div class='ship'>"),
			params = {
				name: "New Vessel",
				className: "'Generic' Class Blankship",
				size: 1,
				hull_max: 1,
				installSpace_max: 1,
				hardpoints_max: 2,
				sections: 1
			},
			sizeInput = $("<input class='sizeInput' value='1'>")
		
		div.append(
			$("<div class='header'>").append(
				$("<button class='headerData'>Collapse</button>").on("click", function (){
					if (div.children(".content").is(":hidden")){
						div.children(".content").show("blind");
						$(this).text("Collapse");
					} else {
						div.children(".content").hide("blind");
						$(this).text("Expand");
					}
				}),
				$("<div class='name'>").append(widgets.editProp(params, "name")),
				$("<div class='className'>").append(widgets.editProp(params, "className"))
			),
			$("<div class='content'>").append(
				$("<div class='info'>").append(
					$("<div>Size Class: </div>").append(sizeInput), 
					$("<div>Hull: </div>").append(widgets.prop(params, "hull_max")),
					$("<div>Install Space: </div>").append(widgets.prop(params, "installSpace_max")),
					$("<div>Hardpoints: </div>").append(widgets.prop(params, "hardpoints_max")),
					$("<div>Sections: </div>").append(widgets.prop(params, "sections"))
				)
			),
			$("<button>Create</button>").on("click", function (){
				create();
			})
		);
		
		sizeInput.spinner({
			"min": 1,
			"stop": function (){ calc() }
		})
		
		function calc (){
			params.size = sizeInput.val();
			params.hull_max = util.cumulate(params.size);
			params.hull = params.hull_max;
			params.installSpace_max = util.cumulate(params.size);
			params.hardpoints_max = Math.ceil(params.size / 2) + 1;
			params.sections = Math.ceil(params.size / 2);
			
			$(div).find("prop").each(function (){
				var key = $(this).data("key");

				$(this).html(params[key]);
			})
		}
		
		
		function create (){
			var i, ship = new strata.Ship(params);
			
			for (i = 0; i < params.sections; i++){
				ship.addSection(new strata.Section({
					name: "Section "+ (i + 1)
				}));
			}
			
			$("#ships").append(ship.display());
		}
		
		return div;
	}

}

var cfg = {
	printStats: [
		"power", "power_storage"
	],
	statOps: {
		power: {
			name: "Power",
			color: "green",
		},
		power_storage: {
			name: "Power Storage",
			color: "blue"
		}
	
	}

};

var data = {};

var strata = {};
strata.Ship = function (data){
	$.extend(this, data);
	
	this.sections = [];
	if (Array.isArray(data.sections)){
		data.sections.forEach(function (sectionData){
			this.addSection(new strata.Section(sectionData));
		}, this)
	}
};
strata.Ship.prototype = {
	
	addSection: function addSection (section){
		this.sections.push(section);
		section.parent = this;
	},
	
	display: function display (){
		var ship = this,
			div = $("<div class='ship'>"),
			content = $("<div class='content'>"),
			header = $("<div class='header'>"),
			info = $("<table class='info'>"),
			sections = $("<div class='sections'>");
			
		div.data("entity", this);
			
		div.append(header, content.append(info, sections));
		header.append(
			$("<button class='headerData'>Collapse</button>").on("click", function (){
				if (div.children(".content").is(":hidden")){
					div.children(".content").show("blind");
					$(this).text("Collapse");
				} else {
					div.children(".content").hide("blind");
					$(this).text("Expand");
				}
			}),
			$("<button class='headerData'>Remove</button>").on("click",
			function (){
				$(":data(entity)").each(function (){
					if ($(this).data("entity") == ship){
						ship.empty($("#storage"));
						$(this).remove();
					}
				})
			}),
			$("<div class='name'>").append(widgets.editProp(this, "name")),
			$("<div class='className'>").append(widgets.editProp(this, "className"))
			
		);
		info.append( 
		$("<td style='width:50%'>").append(widgets.parse(
			"<div>Size Class: "+
			"<prop key='size'></prop></div>"+
			"<div>Hull: "+
			"<prop key='hull'></prop>/"+
			"<prop key='hull_max'></prop></div>"+
			"<div>Install Space: "+
			"<prop key='installSpace'></prop>/"+
			"<prop key='installSpace_max'></prop>"+
			"<div>Hardpoints: "+
			"<prop key='hardpoints'></prop>/"+
			"<prop key='hardpoints_max'></prop>"+
			"</div>"
		, this)),
		$("<td style='width:50%'>").append(widgets.parse(
			"<div>Signature: "+
			"<prop key='signature'></prop></div>"+
			"<div>Power: "+
			"<prop key='power'></prop>"+
			" (<prop key='power_stored'></prop>/"+
			"<prop key='power_storage'></prop>)"+
			"</div>"
		, this)));
	
		this.sections.forEach(function(section){
			sections.append(section.display());
		}, this)
		
		this.update(div);
		
		return div;
	},
	
	update: function update (elem){
		var entity = this,
			stats = {
				signature: 5,
				installSpace: 0,
				hardpoints: 0,
				power: 0,
				power_storage: 0
			}
			
		this.modules().forEach(function(module){
			for (key in stats){
				stats[key] += Number(module[key]) || 0;
			}
		}, this)
		
		$.extend(this, stats);
		
		elem = elem || document;
		
		$(elem).find("prop").each(function (){
			if ($(this).data("entity") != entity) return;
			
			$(this).html(entity[$(this).data("key")]);
		})
	},
	
	modules: function modules (){
		var output = [];
		
		this.sections.forEach(function (section){
			section.modules.forEach(function (module){
				output.push(module);
			})
		}, this)
		
		return output;
	},
	
	empty: function empty (){
	
	}
};

strata.Section = function (data){
	data = data || {};
	
	this.name = data.name || "Section";
	this.modules = [];
	
	if (Array.isArray(data.modules)){
		data.modules.forEach(function (moduleData){
			this.addModule(new strata.Module(moduleData));
		}, this)
	}
};
strata.Section.prototype = {

	addModule: function addModule (module){
		this.modules.push(module);
		module.parent = this;
	},
	
	removeModule: function removeModule (module){
		util.pluck(this.modules, module);
		module.parent = undefined;
	},

	display: function display (){
		var div = $("<div class='section'>"),
			header = $("<div class='header'>").append(widgets.editProp(this, "name")),
			modules = $("<div class='modules'>");

		div.append(header, modules);
		
		this.modules.forEach(function (module){
			modules.append(module.display());
		});

		modules.data("entity", this);
		modules.sortable({
			connectWith: ".modules",
			placeholder: "sortable-placeholder",
			forcePlaceholderSize: true,
			stop: function (event, ui){
				var module = $(ui.item).data("entity"),
					parent = module.parent,
					target = $(ui.item).parent().data("entity");
					
				if (parent != target){
					parent.removeModule(module);
					parent.update();
					target.addModule(module);
					target.update();
				}
			}
		});
		
		return div;
	},

	update: function update (){
		if (this.parent) this.parent.update();
	},
};

strata.Storage = function (data){
	this.name = data.name || "Section";
	this.modules = [];
	
	if (Array.isArray(data.modules)){
		data.modules.forEach(function (moduleData){
			this.addModule(new strata.Module(moduleData));
		}, this)
	}
}
strata.Storage.prototype = {
	addModule: function addModule (module){
		this.modules.push(module);
		module.parent = this;
	},
	
	removeModule: function removeModule (module){
		util.pluck(this.modules, module);
		module.parent = undefined;
	},

	display: function display (){
		var div = $("<div class='section'>"),
			header = $("<div class='header'>"),
			modules = $("<div class='modules'>"),
			filterSelect = $("<select class='storageFilter'><option value='all'>All</option></select>"),
			filter = undefined;

		div.append(header, modules);
		
		header.append(filterSelect, widgets.editProp(this, "name"))
		
		filterSelect.on("change", function (event){
			filter = this.value;
			$(modules).find(".module").each(function (value){
				if (filter == "all"){
					$(this).show();
					return;
				}

				if ($(this).data("entity").type == filter) $(this).show();
				else $(this).hide();
			})
		})
		
		this.modules.forEach(function (module){
			if (!$(filterSelect).find("[value='"+module.type+"']").length){
				filterSelect.append($("<option value='"+module.type+"'>").html(module.type))
			}
			modules.append(module.display());
		});

		modules.data("entity", this);
		modules.sortable({
			connectWith: ".modules",
			placeholder: "sortable-placeholder",
			forcePlaceholderSize: true,
			stop: function (event, ui){
				var module = $(ui.item).data("entity"),
					parent = module.parent,
					target = $(ui.item).parent().data("entity");
					
				if (parent != target){
					parent.removeModule(module);
					parent.update();
					target.addModule(module);
					target.update();
				}
			}
		});
		
		return div;
	},
	
	update: function update (){ }
}

strata.Module = function (data){
	$.extend(this, data);

	this.name = data.name || "Module";
	
};
strata.Module.prototype = {

	display: function profile (){
		var div = $("<div class='module'>"),
			header = $("<div class='header'>").html(this.name),
			stats = $("<div class='stats'>");
		
		
		div.data("entity", this);
		div.append(header, stats);
		
		
		if (this.hardpoints){
			header.append("<span class='headerData'>(H)</span>");
		}
		header.append(widgets.prop(this, "installSpace").addClass("headerData"))
		
		
		cfg.printStats.forEach(function (stat){
			if (this[stat]){
				stats.append(widgets.stat(this, stat));
			}				
		}, this)

		
		return div;
	}
};