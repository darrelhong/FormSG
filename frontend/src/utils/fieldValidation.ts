/**
 * This utility file creates validation rules for `react-hook-form` according
 * to the field schema.
 */
import { RegisterOptions } from 'react-hook-form'
import simplur from 'simplur'
import validator from 'validator'

import {
  AttachmentFieldBase,
  CheckboxFieldBase,
  DecimalFieldBase,
  DropdownFieldBase,
  EmailFieldBase,
  FieldBase,
  HomenoFieldBase,
  LongTextFieldBase,
  MobileFieldBase,
  NricFieldBase,
  NumberFieldBase,
  NumberSelectedValidation,
  RadioFieldBase,
  RatingFieldBase,
  ShortTextFieldBase,
  TextSelectedValidation,
  UenFieldBase,
} from '~shared/types/field'
import { isNricValid } from '~shared/utils/nric-validation'
import {
  isHomePhoneNumber,
  isMobilePhoneNumber,
} from '~shared/utils/phone-num-validation'
import { isUenValid } from '~shared/utils/uen-validation'

import {
  INVALID_DROPDOWN_OPTION_ERROR,
  INVALID_EMAIL_DOMAIN_ERROR,
  INVALID_EMAIL_ERROR,
  REQUIRED_ERROR,
} from '~constants/validation'

import { formatNumberToLocaleString } from './stringFormat'

type OmitUnusedProps<T extends FieldBase> = Omit<
  T,
  'fieldType' | 'description' | 'disabled'
>

type ValidationRuleFn<T extends FieldBase = FieldBase> = (
  schema: OmitUnusedProps<T>,
) => RegisterOptions

const createRequiredValidationRules = (
  schema: Pick<FieldBase, 'required'>,
): RegisterOptions['required'] => {
  return {
    value: schema.required,
    message: REQUIRED_ERROR,
  }
}

const createRequiredInValidationRules = (
  schema: Pick<FieldBase, 'required'>,
): RegisterOptions['validate'] => {
  return {
    required: (value: unknown) => {
      if (!schema.required) return true
      return !!value || REQUIRED_ERROR
    },
  }
}

export const createBaseValidationRules = (
  schema: Pick<FieldBase, 'required'>,
): RegisterOptions => {
  return {
    required: createRequiredValidationRules(schema),
  }
}

export const createDropdownValidationRules: ValidationRuleFn<
  DropdownFieldBase
> = (schema): RegisterOptions => {
  // TODO(#3360): Handle MyInfo dropdown validation
  return {
    ...createBaseValidationRules(schema),
    validate: {
      validOptions: (value: string) => {
        if (!value) return
        return (
          schema.fieldOptions.includes(value) || INVALID_DROPDOWN_OPTION_ERROR
        )
      },
    },
  }
}

export const createRatingValidationRules: ValidationRuleFn<RatingFieldBase> = (
  schema,
): RegisterOptions => {
  return {
    validate: {
      ...createRequiredInValidationRules(schema),
    },
  }
}

export const createAttachmentValidationRules: ValidationRuleFn<
  AttachmentFieldBase
> = (schema) => {
  return createBaseValidationRules(schema)
}

export const createHomeNoValidationRules: ValidationRuleFn<HomenoFieldBase> = (
  schema,
) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val) return true
      return isHomePhoneNumber(val) || 'Please enter a valid landline number'
    },
  }
}

export const createMobileValidationRules: ValidationRuleFn<MobileFieldBase> = (
  schema,
) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val) return true
      return isMobilePhoneNumber(val) || 'Please enter a valid mobile number'
    },
  }
}

export const createNumberValidationRules: ValidationRuleFn<NumberFieldBase> = (
  schema,
) => {
  const { selectedValidation, customVal } = schema.ValidationOptions

  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val || !customVal) return true

      const currLen = val.length

      switch (selectedValidation) {
        case NumberSelectedValidation.Exact:
          return (
            currLen === customVal ||
            simplur`Please enter ${customVal} digit[|s] (${currLen}/${customVal})`
          )
        case NumberSelectedValidation.Min:
          return (
            currLen >= customVal ||
            simplur`Please enter at least ${customVal} digit[|s] (${currLen}/${customVal})`
          )
        case NumberSelectedValidation.Max:
          return (
            currLen <= customVal ||
            simplur`Please enter at most ${customVal} digit[|s] (${currLen}/${customVal})`
          )
      }
    },
  }
}

export const createDecimalValidationRules: ValidationRuleFn<
  DecimalFieldBase
> = (schema) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val: string) => {
      const {
        ValidationOptions: { customMax, customMin },
        validateByValue,
      } = schema
      if (!val) return true

      const numVal = Number(val)
      if (isNaN(numVal)) {
        return 'Please enter a valid decimal'
      }

      if (!validateByValue) return true

      if (
        customMin &&
        customMax &&
        (numVal < customMin || numVal > customMax)
      ) {
        return `Please enter a decimal between ${formatNumberToLocaleString(
          customMin,
        )} and ${formatNumberToLocaleString(customMax)} (inclusive)`
      }

      if (customMin && numVal < customMin) {
        return `Please enter a decimal greater than or equal to ${formatNumberToLocaleString(
          customMin,
        )}`
      }

      if (customMax && numVal > customMax) {
        return `Please enter a decimal less than or equal to ${formatNumberToLocaleString(
          customMax,
        )}`
      }

      return true
    },
  }
}

export const createTextValidationRules: ValidationRuleFn<
  ShortTextFieldBase | LongTextFieldBase
> = (schema) => {
  const { selectedValidation, customVal } = schema.ValidationOptions
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val || !customVal) return true

      const currLen = val.length

      switch (selectedValidation) {
        case TextSelectedValidation.Exact:
          return (
            currLen === customVal ||
            simplur`Please enter ${customVal} character[|s] (${currLen}/${customVal})`
          )
        case TextSelectedValidation.Minimum:
          return (
            currLen >= customVal ||
            simplur`Please enter at least ${customVal} character[|s] (${currLen}/${customVal})`
          )
        case TextSelectedValidation.Maximum:
          return (
            currLen <= customVal ||
            simplur`Please enter at most ${customVal} character[|s] (${currLen}/${customVal})`
          )
      }
    },
  }
}

export const createUenValidationRules: ValidationRuleFn<UenFieldBase> = (
  schema,
) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val) return true
      return isUenValid(val) || 'Please enter a valid UEN'
    },
  }
}

export const createNricValidationRules: ValidationRuleFn<NricFieldBase> = (
  schema,
) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string) => {
      if (!val) return true
      return isNricValid(val) || 'Please enter a valid NRIC'
    },
  }
}

export const createCheckboxValidationRules: ValidationRuleFn<
  CheckboxFieldBase
> = (schema) => {
  return {
    ...createBaseValidationRules(schema),
    validate: (val?: string[]) => {
      const {
        ValidationOptions: { customMin, customMax },
        validateByValue,
      } = schema
      if (!val || !validateByValue) return true

      if (
        customMin &&
        customMax &&
        customMin === customMax &&
        val.length !== customMin
      ) {
        return simplur`Please select exactly ${customMin} option[|s] (${val.length}/${customMin})`
      }

      if (customMin && val.length < customMin) {
        return simplur`Please select at least ${customMin} option[|s] (${val.length}/${customMin})`
      }

      if (customMax && val.length > customMax) {
        return simplur`Please select at most ${customMax} option[|s] (${val.length}/${customMax})`
      }

      return true
    },
  }
}

export const createRadioValidationRules: ValidationRuleFn<RadioFieldBase> = (
  schema,
) => {
  return createBaseValidationRules(schema)
}

export const createEmailValidationRules: ValidationRuleFn<EmailFieldBase> = (
  schema,
) => {
  const allowedDomains = schema.isVerifiable
    ? new Set(schema.allowedEmailDomains)
    : new Set()

  return {
    ...createBaseValidationRules(schema),
    validate: {
      validEmail: (val?: string) => {
        if (!val) return true
        return validator.isEmail(val) || INVALID_EMAIL_ERROR
      },
      validDomain: (val?: string) => {
        // Return if no value, or has no whitelisted domains at all.
        if (!val || allowedDomains.size === 0) return true

        const domainInValue = val.split('@')[1]

        return (
          (domainInValue && allowedDomains.has(`@${domainInValue}`)) ||
          INVALID_EMAIL_DOMAIN_ERROR
        )
      },
    },
  }
}