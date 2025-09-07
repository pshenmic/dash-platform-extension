module.exports = {
  plugins: {
    'postcss-import': {
      resolve: (id, basedir) => {
        const specialImports = [
          'tailwindcss',
          'tailwindcss/base',
          'tailwindcss/components',
          'tailwindcss/utilities',
          'tailwindcss/variants'
        ]

        if (specialImports.includes(id)) {
          return id
        }

        try {
          return require.resolve(id, {
            paths: [basedir, process.cwd()]
          })
        } catch (e) {
          return id
        }
      }
    },
    'postcss-simple-vars': {},
    '@tailwindcss/nesting': {},
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}
