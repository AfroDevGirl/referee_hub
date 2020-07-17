import React, { useEffect, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { RouteComponentProps, useHistory } from 'react-router-dom'

import ExportModal, { ExportType } from '../../components/ExportModal/ExportModal'
import NgbEditModal from '../../components/NgbEditModal'
import StatsViewer from '../../components/StatsViewer'
import TeamEditModal from '../../components/TeamEditModal'
import { exportNgbReferees, exportNgbTeams } from '../../modules/job/job'
import {
  getNationalGoverningBody,
  SingleNationalGoverningBodyState
} from '../../modules/nationalGoverningBody/nationalGoverningBody'
import { RootState } from '../../rootReducer'

import ActionsButton from './ActionsButton'
import NgbTables from './NgbTables'
import Sidebar from './Sidebar'

type IdParams = { id: string }

enum ModalType {
  Export = 'export',
  Team = 'team',
  Edit = 'edit',
}

const NgbProfile = (props: RouteComponentProps<IdParams>) => {
  const { match: { params: { id } } } = props
  const [openModal, setOpenModal] = useState<ModalType>()
  const dispatch = useDispatch()
  const history = useHistory()
  const { ngb, socialAccounts, refereeCount, teamCount, stats } = useSelector((state: RootState): SingleNationalGoverningBodyState => {
    return {
      error: state.nationalGoverningBody.error,
      id: state.nationalGoverningBody.id,
      isLoading: state.nationalGoverningBody.isLoading,
      ngb: state.nationalGoverningBody.ngb,
      refereeCount: state.nationalGoverningBody.refereeCount,
      socialAccounts: state.nationalGoverningBody.socialAccounts,
      stats: state.nationalGoverningBody.stats,
      teamCount: state.nationalGoverningBody.teamCount,
    }
  }, shallowEqual)

  useEffect(() => {
    if (id) {
      dispatch(getNationalGoverningBody(parseInt(id, 10)))
    }
  }, [id, dispatch])

  if (!ngb) return null

  const handleOpenModal = (type: ModalType) => () => setOpenModal(type)
  const handleCloseModal = () => setOpenModal(null)
  const handleExport = (type: ExportType) => {
    handleCloseModal()

    switch(type) {
      case ExportType.Team:
        dispatch(exportNgbTeams());
      case ExportType.Referee:
        dispatch(exportNgbReferees());
    }
  }
  const handleImportClick = () => history.push('/import/team')

  const renderModals = () => {
    switch(openModal) {
      case ModalType.Export:
        return <ExportModal open={true} onClose={handleCloseModal} onExport={handleExport} />
      case ModalType.Team:
        return <TeamEditModal open={true} onClose={handleCloseModal} showClose={true} ngbId={id} />
      case ModalType.Edit:
        return <NgbEditModal open={true} onClose={handleCloseModal} showClose={true} ngbId={parseInt(id, 10)} />
      default:
        return null
    }
  }

  return (
    <div className="w-5/6 mx-auto my-8">
      <div className="flex justify-between w-full mb-8">
        <h1 className="w-full text-4xl text-navy-blue font-extrabold">{ngb.name}</h1>
        <ActionsButton 
          onEditClick={handleOpenModal(ModalType.Edit)}
          onImportClick={handleImportClick}
          onExportClick={handleOpenModal(ModalType.Export)}
          onTeamClick={handleOpenModal(ModalType.Team)}
        />
      </div>
      <div className="flex w-full flex-row">
        <Sidebar 
          ngb={ngb} 
          socialAccounts={socialAccounts} 
          refereeCount={refereeCount} 
          teamCount={teamCount} 
          isEditing={false} 
          ngbId={id} 
        />
        <div className="flex flex-col w-4/5 pl-8">
          <StatsViewer stats={stats} />
          <NgbTables ngbId={parseInt(id, 10)} />
        </div>
      </div>
      {renderModals()}
    </div>
  )
}

export default NgbProfile
