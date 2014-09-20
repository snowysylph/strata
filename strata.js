var util = {
	tri: function tri (level){
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
				var key = /^[^:]*/.exec(row),
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

	editText: function editText (object, key, editMode){
		var div = $("<div class='editText'>");
		
		function toggle (){
			$(div).find(".displayMode").toggleClass("hidden");
			$(div).find(".editMode").toggleClass("hidden");
		}
		
		div.append(
			$("<span class='display displayMode'>").text(object[key]),
			
			$("<input type='text' class='editMode hidden'>").val(object[key])
			.on("change", function (){
				object[key] = event.target.value;
				$(div).find(".display").text(object[key]);
				$(div).find("input").blur();
			}).on("blur", function (event){ toggle() }),
			
			$("<button class='editButton displayMode'>").html("-").on("click", function(){
				toggle();
				$(div).find("input").focus();
			})
		)
		
		if (editMode) toggle();
		
		return div;
	},

	createShip: function createShip (){
		var div = $("<div class='createShip'>"),
			sizeInput = $("<input class='size'>").spinner({
				
			}),
			hullDisplay = $("<div>Hull Points: </div>"),
			sectionDisplay = $("<div>Sections: </div>");
		
		div.append(sizeInput, hullDisplay, sectionDisplay);
		
		function calc (){
			var size = sizeInput.val(),
				hull = util.tri(size),
				sectionCount = Math.ciel(size / 2);
		}
		
		
		return div;
	}
}


var strata = {};
strata.Ship = function (data){
	this.name = data.name || "Ship";
	this.className = data.className || "Generic Vessel";
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
		var div = $("<div class='ship'>"),
			info = $("<div class='info'>"),
			sections = $("<div class='sections'>");
			
		div.append(info, sections);
		info.append(
			$("<div class='name'>").append(widgets.editText(this, "name")),
			$("<div class='className'>").append(widgets.editText(this, "className"))
		);
	
		this.sections.forEach(function(section){
			sections.append(section.display());
		}, this)
		
		return div;
	},
};

strata.Section = function (data){
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
			header = $("<div class='header'>").append(widgets.editText(this, "name")),
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
					target.addModule(module);
				}
			}
		});
		
		return div;
	},
};

strata.Module = function (data){
	this.name = data.name || "Module";
	
};
strata.Module.prototype = {

	display: function profile (){
		var div = $("<div class='module'>"),
			header = $("<div class='header'>").html(this.name);
		
		div.data("entity", this);
		div.append(header);
		
		return div;
	},
};