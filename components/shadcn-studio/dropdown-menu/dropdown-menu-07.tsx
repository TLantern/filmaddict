"use client"

import { UserIcon, SettingsIcon, BellIcon, LogOutIcon, CreditCardIcon } from 'lucide-react'
import { useUser, useClerk } from '@clerk/nextjs'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const listItems = [
  {
    icon: UserIcon,
    property: 'Profile'
  },
  {
    icon: SettingsIcon,
    property: 'Settings'
  },
  {
    icon: CreditCardIcon,
    property: 'Billing'
  },
  {
    icon: BellIcon,
    property: 'Notifications'
  },
  {
    icon: LogOutIcon,
    property: 'Sign Out'
  }
]

const DropdownMenuUserMenuDemo = () => {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  const handleItemClick = (property: string) => {
    if (property === 'Sign Out') {
      signOut()
    }
  }

  if (!isLoaded) {
    return null
  }

  const userImageUrl = user?.imageUrl
  const userInitials = user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'
  const userName = user?.fullName || user?.firstName || 'User'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-10 w-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-0">
          {userImageUrl ? (
            <img src={userImageUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
              {userInitials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-all duration-200 ease-out'>
        <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          {listItems.map((item, index) => (
            <DropdownMenuItem 
              key={index} 
              onClick={() => handleItemClick(item.property)} 
              className="cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800"
            >
              <item.icon className="h-4 w-4 mr-2" />
              <span>{item.property}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuUserMenuDemo
