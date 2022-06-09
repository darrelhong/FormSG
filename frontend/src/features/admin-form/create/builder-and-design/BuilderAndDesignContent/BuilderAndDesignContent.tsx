import { useEffect } from 'react'
import { Droppable } from 'react-beautiful-dnd'
import { Box, Flex } from '@chakra-ui/react'

import { useCreatePageSidebar } from '../../common/CreatePageSidebarContext'
import { FIELD_LIST_DROP_ID } from '../constants'
import { DndPlaceholderProps } from '../types'
import {
  setToInactiveSelector,
  useBuilderAndDesignStore,
} from '../useBuilderAndDesignStore'

import { EmptyFormPlaceholder } from './BuilderAndDesignPlaceholder/EmptyFormPlaceholder'
import BuilderAndDesignPlaceholder from './BuilderAndDesignPlaceholder'
import { BuilderFields } from './BuilderFields'
import { useBuilderFields } from './useBuilderFields'

interface BuilderAndDesignContentProps {
  placeholderProps: DndPlaceholderProps
}

export const BuilderAndDesignContent = ({
  placeholderProps,
}: BuilderAndDesignContentProps): JSX.Element => {
  const setFieldsToInactive = useBuilderAndDesignStore(setToInactiveSelector)
  const { builderFields } = useBuilderFields()
  const { handleBuilderClick } = useCreatePageSidebar()

  useEffect(() => setFieldsToInactive, [setFieldsToInactive])

  return (
    <>
      <Flex flex={1} bg="neutral.200" overflow="auto">
        <Flex
          m={{ base: 0, md: '2rem' }}
          mb={0}
          flex={1}
          bg={{ base: 'secondary.100', md: 'primary.100' }}
          p={{ base: '1.5rem', md: '2.5rem' }}
          justify="center"
          overflow="auto"
        >
          <Flex
            h="fit-content"
            bg="white"
            p={{ base: 0, md: '2.5rem' }}
            maxW="57rem"
            w="100%"
            flexDir="column"
          >
            <Droppable droppableId={FIELD_LIST_DROP_ID}>
              {(provided, snapshot) =>
                builderFields?.length ? (
                  <Box
                    pos="relative"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <BuilderFields
                      fields={builderFields}
                      isDraggingOver={snapshot.isDraggingOver}
                    />
                    {provided.placeholder}
                    <BuilderAndDesignPlaceholder
                      placeholderProps={placeholderProps}
                      isDraggingOver={snapshot.isDraggingOver}
                    />
                  </Box>
                ) : (
                  <EmptyFormPlaceholder
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    isDraggingOver={snapshot.isDraggingOver}
                    onClick={handleBuilderClick}
                  />
                )
              }
            </Droppable>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}