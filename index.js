var fs = require('fs')
var path = require('path')
var cssToJss = require('jss-cli/lib/cssToJss')
var requireResolve = require('require-resolve')

function toTree(t, obj) {
    var props = []

    for (var key in obj) {
        if (key === 'fallbacks') {
            continue
        }

        var val = obj[key]

        if (val === null) {
            val = t.nullLiteral()
        } else {
            var type = typeof(val)

            if (type === 'undefined') {
                continue
            }

            switch(type) {
                case 'string':
                    val = t.stringLiteral(val)

                    break

                case 'number':
                    val = t.numericLiteral(val)

                    break

                case 'boolean':
                    val = t.booleanLiteral(val)

                    break

                default:
                    val = toTree(t, val)
            }
        }

        props.push(t.objectProperty(t.stringLiteral(key), val))
    }

    return t.objectExpression(props)
}

module.exports = function (babel) {
    var t = babel.types

    return {
        visitor: {
            ImportDeclaration: {
                // pretty much guessing what input paramters are called

                exit: function(decl, file) {
                    var node = decl.node

                    // everything you see here is a complete guesswork but that
                    // is what you get without proper documentation - #babel6

                    if (node.source.value.endsWith('.css')) {
                        if (node.specifiers.length == 0) {
                            decl.remove();
                        } else {

                            var mod = requireResolve(node.source.value, path.resolve(file.file.opts.filename))
                            var id = t.identifier(node.specifiers[0].local.name)
                            var value = toTree(t, cssToJss({dashes: true, code: fs.readFileSync(mod.src).toString()})['@global']) // due to bugs we cannot use t.valueToNode
    
                            decl.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(id, value)]))
                        }
                    } else
                    if (node.source.value.endsWith('.css!')) {
                        var mod = requireResolve(node.source.value.slice(0, -1), path.resolve(file.file.opts.filename))
                        var id = t.identifier(node.specifiers[0].local.name)
                        var value = toTree(t, cssToJss({dashes: true, code: fs.readFileSync(mod.src).toString()})) // due to bugs we cannot use t.valueToNode

                        decl.replaceWith(t.variableDeclaration('var', [t.variableDeclarator(id, value)]))
                    }
                }
            }
        }
    }
}
