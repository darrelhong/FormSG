import { useCallback, useMemo } from 'react'
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
import simplur from 'simplur'

import { FormAuthType, FormColorTheme } from '~shared/types/form/form'

import { BxsTimeFive } from '~assets/icons/BxsTimeFive'
import Button from '~components/Button'

import { usePublicAuthMutations } from '~features/public-form/mutations'
import { usePublicFormContext } from '~features/public-form/PublicFormContext'

const useFormHeader = () => {
  const { form, spcpSession, formId } = usePublicFormContext()
  const { handleLogoutMutation } = usePublicAuthMutations(formId)

  const titleColour = useMemo(() => {
    if (form?.startPage.colorTheme === FormColorTheme.Orange) {
      return 'secondary.700'
    }
    return 'white'
  }, [form?.startPage.colorTheme])

  const titleBg = useMemo(
    () =>
      form?.startPage.colorTheme
        ? `theme-${form.startPage.colorTheme}.500`
        : `neutral.200`,
    [form?.startPage.colorTheme],
  )

  const estTimeString = useMemo(() => {
    if (!form?.startPage.estTimeTaken) return ''
    return simplur`${form?.startPage.estTimeTaken} min[|s] estimated time to complete`
  }, [form])

  const handleLogout = useCallback(() => {
    if (!form || form?.authType === FormAuthType.NIL) return
    return handleLogoutMutation.mutate(form.authType)
  }, [form, handleLogoutMutation])

  return {
    title: form?.title,
    estTimeString,
    titleBg,
    titleColour,
    loggedInId: spcpSession?.userName,
    handleLogout,
  }
}

export interface MiniHeaderProps {
  isOpen: boolean
}

// Exported for testing.
export const MiniHeader = ({ isOpen }: MiniHeaderProps): JSX.Element => {
  const { title, titleBg, titleColour } = useFormHeader()

  const { miniHeaderRef } = usePublicFormContext()

  return (
    <Slide
      // Screen readers do not need to know of the existence of this component.
      aria-hidden
      ref={miniHeaderRef}
      direction="top"
      in={isOpen}
      style={{ zIndex: 10 }}
    >
      <Box bg={titleBg} px="2rem" py="1rem">
        <Skeleton isLoaded={!!title}>
          <Text as="h2" textStyle="h2" textAlign="start" color={titleColour}>
            {title ?? 'Loading title'}
          </Text>
        </Skeleton>
      </Box>
    </Slide>
  )
}

export const FormHeader = (): JSX.Element => {
  const {
    title,
    estTimeString,
    titleBg,
    titleColour,
    loggedInId,
    handleLogout,
  } = useFormHeader()
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

  return (
    <>
      <MiniHeader isOpen={isOpen} />
      <Flex p="3rem" justify="center" bg={titleBg}>
        <Flex
          maxW="32.5rem"
          flexDir="column"
          align="center"
          color={titleColour}
        >
          <Skeleton isLoaded={!!title}>
            <Text as="h1" textStyle="h1" textAlign="center">
              {title ?? 'Loading title'}
            </Text>
          </Skeleton>
          {estTimeString && (
            <Flex align="center" justify="center" mt="1rem">
              <Icon as={BxsTimeFive} fontSize="1.5rem" mr="0.5rem" />
              <Text textStyle="body-2">{estTimeString}</Text>
            </Flex>
          )}
          {loggedInId ? (
            <Button
              mt="2.25rem"
              variant="reverse"
              aria-label="Log out"
              rightIcon={<BiLogOutCircle fontSize="1.5rem" />}
              onClick={handleLogout}
            >
              {loggedInId} - Log out
            </Button>
          ) : null}
        </Flex>
      </Flex>
      {/* Sentinel to know when sticky navbar is starting */}
      <Waypoint topOffset="64px" onPositionChange={handlePositionChange} />
    </>
  )
}