import { Flex } from '@chakra-ui/react'

import { CreatePageContent } from './common/CreatePageContent'
import { CreatePageSidebar } from './common/CreatePageSidebar'
import { CreatePageSidebarProvider } from './common/CreatePageSidebarContext'
import { FeatureTour } from './featureTour/FeatureTour'

export interface CreatePageProps {
  shouldFeatureTourRun?: boolean
}

export const CreatePage = ({
  shouldFeatureTourRun,
}: CreatePageProps): JSX.Element => {
  // TODO: need to add logic to only show feature tour when user has
  // not seen it before

  return (
    <Flex h="100%" w="100%" overflow="auto" bg="neutral.200" direction="row">
      <CreatePageSidebarProvider>
        <FeatureTour shouldRun={shouldFeatureTourRun ?? false} />
        <CreatePageSidebar />
        <CreatePageContent />
      </CreatePageSidebarProvider>
    </Flex>
  )
}