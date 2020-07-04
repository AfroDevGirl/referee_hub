import { capitalize } from 'lodash'
import React, { useEffect } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'

import { GetRefereesFilter } from '../../apis/referee'
import { getReferees, Referee, updateFilters } from '../../modules/referee/referees'
import { RootState } from '../../rootReducer'
import { AssociationType } from '../../schemas/getRefereesSchema'
import Table, { CellConfig } from '../Table/Table'

const HEADER_CELLS = ['name', 'highest certification', 'associated teams', 'secondary NGB']

const findHighestCert = (referee: Referee) => {
  return referee?.certifications.find((cert) => {
    if (cert.level === 'head') {
      return true
    } else if (cert.level === 'assistant') {
      return true
    } else if (cert.level === 'snitch') {
      return true
    }

    return false
  })
}

const rowConfig: CellConfig<Referee>[] = [
  {
    cellRenderer: (item: Referee) => {
      return `${item?.referee.firstName} ${item?.referee.lastName}`
    },
    dataKey: 'name',
  },
  {
    cellRenderer: (item: Referee) => {
      const highestCert = findHighestCert(item)
      return highestCert ? capitalize(highestCert?.level) : 'Uncertified'
    },
    dataKey: 'certifications'
  },
  {
    cellRenderer: (item: Referee) => {
      return item?.teams.map((team) => team.name).join(', ')
    },
    dataKey: 'teams'
  },
  {
    cellRenderer: (item: Referee) => {
      const secondary = item?.locations.filter((location) => location.associationType === AssociationType.Secondary)
      const secondaryName = secondary.length && item?.ngbs.find(ngb => ngb.id === secondary[0].nationalGoverningBodyId.toString())?.name
      return secondaryName || 'N/A'
    },
    dataKey: 'locations'
  }
]

type NewRefereeTableProps = {
  ngbId: number;
}

const NewRefereeTable = (props: NewRefereeTableProps) => {
  const history = useHistory()
  const dispatch = useDispatch()
  const { referees, isLoading } = useSelector((state: RootState) => state.referees, shallowEqual)

  useEffect(() => {
    const filter: GetRefereesFilter = { nationalGoverningBodies: [props.ngbId] }
    dispatch(updateFilters(filter))
    dispatch(getReferees(filter))
  }, [])

  const handleRowClick = (id: string) => {
    history.push(`/referees/${id}`)
  }

  const renderEmpty = () => {
    return (
      <h2>No referees found.</h2>
    )
  }

  return (
    <Table
      items={referees}
      isLoading={isLoading}
      headerCells={HEADER_CELLS}
      rowConfig={rowConfig}
      onRowClick={handleRowClick}
      emptyRenderer={renderEmpty}
      isHeightRestricted={true}
    />
  )
}

export default NewRefereeTable
