import { TabPanel, TabPanels } from '@chakra-ui/react'

import AdminFormNavbar from './components/AdminFormNavbar'
import { AdminFormTabProvider } from './components/AdminFormTabProvider'

export const AdminFormPage = (): JSX.Element => {
  return (
    <AdminFormTabProvider>
      <AdminFormNavbar />
      <TabPanels>
        <TabPanel>
          <p>Insert builder page here!</p>
        </TabPanel>
        <TabPanel>
          <p>Insert settings page here!</p>
        </TabPanel>
        <TabPanel>
          <p>Insert results page here!</p>
        </TabPanel>
      </TabPanels>
    </AdminFormTabProvider>
  )
}
