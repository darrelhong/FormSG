import { Text } from '@chakra-ui/react'

export interface CategoryHeaderProps {
  children: React.ReactNode
}

export const CategoryHeader = ({
  children,
}: CategoryHeaderProps): JSX.Element => {
  return (
    <Text as="h2" textStyle="h2" color="secondary.500" mb="2.5rem">
      {children}
    </Text>
  )
}