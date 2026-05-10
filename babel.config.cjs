/**
 * Jest + babel-jest; mirrors Vite's import.meta.env for files that use import.meta (e.g. logger).
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    function babelImportMetaEnv({ types: t }) {
      return {
        visitor: {
          MetaProperty(path) {
            if (
              !t.isIdentifier(path.node.meta, { name: 'import' }) ||
              !t.isIdentifier(path.node.property, { name: 'meta' })
            ) {
              return;
            }
            path.replaceWith(
              t.objectExpression([
                t.objectProperty(
                  t.identifier('env'),
                  t.objectExpression([
                    t.objectProperty(t.identifier('DEV'), t.booleanLiteral(false)),
                    t.objectProperty(
                      t.identifier('VITE_DEBUG'),
                      t.stringLiteral(process.env.VITE_DEBUG === 'true' ? 'true' : 'false'),
                    ),
                    t.objectProperty(t.identifier('MODE'), t.stringLiteral('test')),
                  ]),
                ),
              ]),
            );
          },
        },
      };
    },
  ],
};
