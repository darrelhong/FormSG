import { RefObject, useCallback } from 'react'
import { BiLogOutCircle } from 'react-icons/bi'
import { Waypoint } from 'react-waypoint'
import {
  Box,
  Flex,
  Icon,
  Skeleton,
  Slide,
  Text,
  useDisclosure,
} from '@chakra-ui/react'

import { BxMenuAltLeft } from '~assets/icons/BxMenuAltLeft'
import { BxsTimeFive } from '~assets/icons/BxsTimeFive'
import Button from '~components/Button'
import IconButton from '~components/IconButton'

export type MiniHeaderProps = Pick<
  FormHeaderProps,
  | 'title'
  | 'titleBg'
  | 'titleColor'
  | 'activeSectionId'
  | 'miniHeaderRef'
  | 'onMobileDrawerOpen'
> & { isOpen: boolean }

export const MiniHeader = ({
  title,
  titleBg,
  titleColor,
  activeSectionId,
  miniHeaderRef,
  onMobileDrawerOpen,
  isOpen,
}: MiniHeaderProps): JSX.Element => (
  <Slide
    // Screen readers do not need to know of the existence of this component.
    aria-hidden
    ref={miniHeaderRef}
    direction="top"
    in={isOpen}
    style={{ zIndex: 1000 }}
  >
    <Box
      bg={titleBg}
      px={{ base: '1.5rem', md: '2rem' }}
      py={{ base: '0.5rem', md: '1rem' }}
    >
      <Skeleton isLoaded={!!title}>
        <Flex
          align="center"
          flex={1}
          gap="0.5rem"
          justify="space-between"
          flexDir="row"
        >
          <Flex alignItems="center" minH={{ base: '4rem', md: '0' }}>
            <Text
              textStyle={{ base: 'h4', md: 'h2' }}
              textAlign="start"
              color={titleColor}
            >
              {title ?? 'Loading title'}
            </Text>
          </Flex>
          {activeSectionId ? (
            // Section sidebar icon should only show up if sections exist
            <IconButton
              variant="solid"
              colorScheme="primary"
              aria-label="Mobile section sidebar"
              fontSize="1.5rem"
              icon={<BxMenuAltLeft />}
              d={{ base: 'flex', md: 'none' }}
              onClick={onMobileDrawerOpen}
            />
          ) : null}
        </Flex>
      </Skeleton>
    </Box>
  </Slide>
)

interface FormHeaderProps {
  title?: string
  estTimeString: string
  titleBg: string
  titleColor: string
  showHeader?: boolean
  loggedInId?: string
  showMiniHeader?: boolean
  activeSectionId?: string
  miniHeaderRef?: RefObject<HTMLDivElement>
  onMobileDrawerOpen?: () => void
  handleLogout?: () => void
}

export const FormHeader = ({
  title,
  estTimeString,
  titleBg,
  titleColor,
  showHeader,
  loggedInId,
  showMiniHeader,
  activeSectionId,
  miniHeaderRef,
  onMobileDrawerOpen,
  handleLogout,
}: FormHeaderProps): JSX.Element | null => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handlePositionChange = useCallback(
    (pos: Waypoint.CallbackArgs) => {
      // Required so a page that loads in the middle of the page can still
      // trigger the mini header.
      if (pos.currentPosition === 'above') {
        onOpen()
      } else {
        onClose()
      }
    },
    [onClose, onOpen],
  )

  if (!showHeader) return null

  return (
    <>
      {showMiniHeader ? (
        <MiniHeader
          title={title}
          titleBg={titleBg}
          titleColor={titleColor}
          activeSectionId={activeSectionId}
          miniHeaderRef={miniHeaderRef}
          onMobileDrawerOpen={onMobileDrawerOpen}
          isOpen={isOpen}
        />
      ) : null}
      <Flex
        px={{ base: '1.5rem', md: '3rem' }}
        py={{ base: '2rem', md: '3rem' }}
        justify="center"
        bg={titleBg}
      >
        <Flex
          maxW="57rem"
          flexDir="column"
          align={{ base: 'start', md: 'center' }}
          color={titleColor}
        >
          <Skeleton isLoaded={!!title}>
            <Text
              as="h1"
              textStyle="h1"
              textAlign={{ base: 'start', md: 'center' }}
            >
              {title ?? 'Loading title'}
            </Text>
          </Skeleton>
          {estTimeString && (
            <Flex align="flex-start" justify="center" mt="0.875rem">
              <Icon as={BxsTimeFive} fontSize="1.5rem" mr="0.5rem" />
              <Text textStyle="body-2" mt="0.125rem">
                {estTimeString}
              </Text>
            </Flex>
          )}
          {loggedInId ? (
            <Button
              mt="2.25rem"
              variant="reverse"
              aria-label="Log out"
              rightIcon={<BiLogOutCircle fontSize="1.5rem" />}
              onClick={handleLogout}
              isDisabled={!handleLogout}
            >
              {loggedInId} - Log out
            </Button>
          ) : null}
        </Flex>
      </Flex>
      {
        /* Sentinel to know when sticky navbar is starting */
        showMiniHeader ? (
          <Waypoint topOffset="64px" onPositionChange={handlePositionChange} />
        ) : null
      }
    </>
  )
}
