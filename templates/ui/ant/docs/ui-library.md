# Ant Design UI library overlay

This overlay wires an Ant Design provider into the generated app. The provider
is mounted automatically in `src/providers/app-providers.tsx` and loads
`@ant-design/v5-patch-for-react-19`, which antd v5 needs to run on React 19.

Files added:

- src/providers/ant-provider.tsx

Dependencies added when selected: `antd`, `@ant-design/v5-patch-for-react-19`.
