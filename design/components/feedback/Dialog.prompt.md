Centered modal with a blurred dark scrim — used for confirmations (delete student), create/edit forms.

```jsx
<Dialog open={open} onClose={close} title="Remover aluno" description="Essa ação não pode ser desfeita.">
  <Button variant="destructive" fullWidth>Remover</Button>
</Dialog>
```
