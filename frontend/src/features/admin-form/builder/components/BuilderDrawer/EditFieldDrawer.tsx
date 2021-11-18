import { BiLeftArrowAlt } from 'react-icons/bi'
import { Box, Flex } from '@chakra-ui/react'

import IconButton from '~components/IconButton'

import { useFormBuilder } from '../FormBuilderScreen/FormBuilderContext'

import { BuilderDrawerCloseButton } from './BuilderDrawerCloseButton'

export const EditFieldDrawer = (): JSX.Element | null => {
  const { setCurrentSelectedField, currentSelectedField: field } =
    useFormBuilder()

  if (!field) return null

  return (
    <Box>
      <Flex
        pos="sticky"
        top={0}
        px="1.5rem"
        py="1rem"
        align="center"
        borderBottom="1px solid var(--chakra-colors-neutral-300)"
        bg="white"
      >
        <IconButton
          minH="1.5rem"
          minW="1.5rem"
          aria-label="Back to field selection"
          variant="clear"
          colorScheme="secondary"
          onClick={() => setCurrentSelectedField(null)}
          icon={<BiLeftArrowAlt />}
        />
        <Box m="auto">Edit {field.fieldType}</Box>
        <BuilderDrawerCloseButton />
      </Flex>
      <Flex flexDir="column">TODO: Insert field options here</Flex>
    </Box>
  )
}