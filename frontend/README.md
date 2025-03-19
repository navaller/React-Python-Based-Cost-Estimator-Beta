This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Issues to work on

UI Settings/Materials/

1. when a user adds a new property while in the material details dialog, the property can not be deleted while in the dialog. once you close and reopen it , it can be deleted. this could be because the new property id is not available for delete.
2. After adding a new material, there is no way to edit the material, we can only delete
3. Editting a property the drop down does not work, no options exist

Settings/Part Classification/

1. When the user enters a value in the inpout fields i want to convert that to lowercase and replace spaces with "\_" before storing, do you think its a good idea atleast for fields which are names . por should we use something like a display name and value . need youor thoughts, no coding

Settings/Operations/

1. when on the edit dialog of operations, the costing default drop down is not populating the value , instead it asks to pick one. do we need to pass that value to operations form when in edit mode .
2. we need to make the operation name upper case for diaplaying on ui
3. Category field whould be a combo box, so a combination of drop down and if we need to add a new value we just type and save
4. need to handle the picking of part classifications applicable to a an operation in a better way, probably using multi select having a way to pick one or a few or all
