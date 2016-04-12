# Graph Marking

[GitHub](https://github.com/meteor-shuttler/graph-marking) [Atmosphere.js](atmospherejs.com/shuttler/graph-marking)

Marking documents if has link in the graph.

Algorithm for maintaining the integrity of the documents markings. The database Mongo no JOIN. Graphs can store links, but it is necessary to carry out cross-search based on the graph relations documents.

## Install

```
meteor add shuttler:graph-marking
```

##### Required
* [shuttler:ref](https://github.com/meteor-shuttler/ref)
* [shuttler:graphs](https://github.com/meteor-shuttler/graphs)

## Theory

In application can be many graphs and collections. In one graph can be active many selection logics. It create many different logics of link interpritation. Each interpretation can have their markings certain documents.

## Example

```js
// Create some graph.
var graph = new Mongo.Collection('graph');
graph.attachGraph();

// Create some documents collections.
var documents = new Mongo.Collection('documents');
documents.insert({ _id: '1' });
documents.insert({ _id: '2' });

// Initialize marking targets.
var options = Shuttler.GraphMarking.byTarget;
marking = Shuttler.GraphMarking(graph, 'children', options).in(documents, '__graph');

// Create one link.
var linkId = graph.link.insert(documents.findOne('1'), documents.findOne('2'));
graph.findOne(linkId);
// { _source: { id: '1', collection: 'documents' }, _target: { id: '2', collection: 'documents' } }
documents.findOne('2');
// { _id: '2', __graph: [{ id: '1', collection: 'documents'}] }

// Create not unique link.
graph.link.insert(documents.findOne('1'), documents.findOne('2'));
documents.findOne('2');
// { _id: '2', __graph: [{ id: '1', collection: 'documents'}] }

// Create second unique link.
graph.link.insert(documents.findOne('2'), documents.findOne('2'));
documents.findOne('2');
// { _id: '2', __graph: [{ id: '1', collection: 'documents'}, { id: '2', collection: 'documents'}] }

graph.getMarkingField('children', documents);
// __graph
```

## Documentation

### Marking

#### graph.getMarkingField
> (name: String, collection: Mongo.Collection) => String|undefined

Return undefined or field sended in `graphMarking.in` wather for current graph, collection and side.

#### [new] Shuttler.GraphMarking
> (graph: Mongo.Collection, name: String, options?: Options)

It creates a an instance of maintaining marking of documents in graph.

To the graph will be added `_marking` field with object:

> { (name: String): (markingInstance: Shuttler.GraphMarking) }

##### Options

In the package there are two sets of prepared options for marking.
* `Shuttler.GraphMarking.bySource`
* `Shuttler.GraphMarking.byTarget`

###### afterLink
> (handler: (userId, unlinked?, linked, fieldNames, modifier, options, marking) => void)

###### afterUnlink
> (handler: (userId, unlinked?, linked, fieldNames, modifier, options, marking) => void)

### Watchers

#### .in
> (collection: Mongo.Collection, field: String) => Shuttler.GraphMarking

It includes markings for documents in this collection in a particular field.

To the collection will be added `_markedByGraphs` field with object:

> { (field: String): (markingInstance: Shuttler.GraphMarking) }

##### ._in
> { (collection: String): (field: String) }