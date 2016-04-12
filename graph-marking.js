// (name: String, collection: Mongo.Collection) => String|undefined
Mongo.Collection.prototype.getMarkingField = function(name, collection) {
	if (!this._marking || !this._marking[name])
		return undefined;
	else return this._marking[name]._in[collection._ref];
};

// [new] (graph: Mongo.Collection, name: String, options: Options)
Shuttler.GraphMarking = function(graph, name, options) {
	var marking = this;
	
	this._name = name;
	
	if (!(this instanceof Shuttler.GraphMarking))
		return new Shuttler.GraphMarking(graph, name, options);
		
	if (!(graph instanceof Mongo.Collection) || !graph.isGraph)
		throw new Meteor.Error('Collection '+graph._ref+' is not a graph.');
	
	if (graph._marking && graph._marking[name])
		throw new Meteor.Error('Graph marking with name '+name+' already defined.');
	
	// Mongo.Collection
	this._graph = graph;
	
	// { (collection: String): (field: String) }
	this._in = {};
	
	if (!options) var options = {};
	var contextOptions = Shuttler.GraphMarking.OptionsSchema.newContext();
	Shuttler.GraphMarking.OptionsSchema.clean(options);
	if (!contextOptions.validate(options))
		throw new Meteor.Error(contextOptions.keyErrorMessage(contextOptions.invalidKeys()[0].name));
	
	this._options = options;
	
	graph.after.link(function(userId, unlinked, linked, fieldNames, modifier, options) {
		marking._options.afterLink(userId, unlinked, linked, fieldNames, modifier, options, marking);
	});
	
	graph.after.unlink(function(userId, unlinked, linked, fieldNames, modifier, options) {
		marking._options.afterUnlink(userId, unlinked, linked, fieldNames, modifier, options, marking);
	});
	
	if (!graph._marking)
		graph._marking = {};
	graph._marking[this._name] = marking;
};

// (collection: Mongo.Collection, field: String) => Shuttler.GraphMarking
Shuttler.GraphMarking.prototype.in = function(collection, field) {
	
	// { (field: String): (markingInstance: Shuttler.GraphMarking) }
	if (!collection._markedByGraphs)
		collection._markedByGraphs = {};
	collection._markedByGraphs[field] = this;
	
	// { (collection: String): (field: String) }
	this._in[collection._ref] = field;
	
	return this;
};

Shuttler.GraphMarking.byTarget = {
	afterLink: function(userId, unlinked, linked, fieldNames, modifier, options, marking) {
		var document = linked.target();
		var collection = document.Collection();
		var field = marking._graph.getMarkingField(marking._name, collection);
		if (field)
			collection.update(document._id, { $addToSet: { [field]: linked['_source'] } });
	},
	afterUnlink: function(userId, unlinked, linked, fieldNames, modifier, options, marking) {
		var document = unlinked.target();
		var collection = document.Collection();
		var others = marking._graph.links.find(unlinked._source, unlinked._target)
		if (!others.count()) {
			var field = marking._graph.getMarkingField(marking._name, collection);
			if (field)
				collection.update(document._id, { $pull: { [field]: unlinked['_source'] } });
		}
	}
};

Shuttler.GraphMarking.bySource = {
	afterLink: function(userId, unlinked, linked, fieldNames, modifier, options, marking) {
		var document = linked.source();
		var collection = document.Collection();
		var field = marking._graph.getMarkingField(marking._name, collection);
		if (field)
			collection.update(document._id, { $addToSet: { [field]: linked['_target'] } });
	},
	afterUnlink: function(userId, unlinked, linked, fieldNames, modifier, options, marking) {
		var document = unlinked.source();
		var collection = document.Collection();
		var others = marking._graph.links.find(unlinked._source, unlinked._target)
		if (!others.count()) {
			var field = marking._graph.getMarkingField(marking._name, collection);
			if (field)
				collection.update(document._id, { $pull: { [field]: unlinked['_target'] } });
		}
	}
};

Shuttler.GraphMarking.OptionsSchema = new SimpleSchema({
	afterLink: {
		type: Function,
		optional: true,
		defaultValue: Shuttler.GraphMarking.byTarget.afterLink
	},
	afterUnlink: {
		type: Function,
		optional: true,
		defaultValue: Shuttler.GraphMarking.byTarget.afterUnlink
	}
});